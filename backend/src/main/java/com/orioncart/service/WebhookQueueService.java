package com.orioncart.service;

import com.orioncart.domain.WebhookDelivery;
import com.orioncart.repository.WebhookDeliveryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;

@Service
public class WebhookQueueService {

    private final WebhookDeliveryRepository deliveryRepository;
    private final PaymentService paymentService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${webhook.exchange:webhook.exchange}")
    private String exchange;

    @Value("${webhook.routing-key:webhook.delivery}")
    private String routingKey;

    @Value("${webhook.queue.max-attempts:5}")
    private int maxAttempts;

    @Value("${webhook.queue.base-backoff-ms:2000}")
    private long baseBackoffMs;

    public WebhookQueueService(WebhookDeliveryRepository deliveryRepository, PaymentService paymentService, RabbitTemplate rabbitTemplate) {
        this.deliveryRepository = deliveryRepository;
        this.paymentService = paymentService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public WebhookDelivery enqueue(Long paymentId, String status, String signature, String idempotencyKey, String payload) {
        // deduplicate by idempotency key
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            WebhookDelivery existing = deliveryRepository.findByIdempotencyKey(idempotencyKey);
            if (existing != null) return existing;
        }

        WebhookDelivery d = new WebhookDelivery();
        d.setPaymentId(paymentId);
        d.setStatus("PENDING");
        d.setAttempts(0);
        d.setNextAttemptAt(OffsetDateTime.now());
        d.setIdempotencyKey(idempotencyKey);
        d.setPayload(payload);
        d.setSignature(signature);
        WebhookDelivery saved = deliveryRepository.save(d);
        // publish delivery metadata as JSON to RabbitMQ for async processing
        try {
            java.util.Map<String,Object> msg = new java.util.HashMap<>();
            msg.put("deliveryId", saved.getId());
            msg.put("paymentId", saved.getPaymentId());
            msg.put("idempotencyKey", saved.getIdempotencyKey());
            msg.put("signature", saved.getSignature());
            msg.put("payload", saved.getPayload());
            String json = objectMapper.writeValueAsString(msg);
            rabbitTemplate.convertAndSend(exchange, routingKey, json);
        } catch (Exception ex) {
            // swallow; processing will happen via DB poller as a fallback
        }
        return saved;
    }

    @Scheduled(fixedDelayString = "${webhook.queue.poll-interval-ms:5000}")
    public void processDue() {
        List<String> statuses = Arrays.asList("PENDING", "FAILED");
        List<WebhookDelivery> due = deliveryRepository.findTop20ByStatusInAndNextAttemptAtBeforeOrderByNextAttemptAtAsc(statuses, OffsetDateTime.now());
        for (WebhookDelivery d : due) {
            processSingle(d);
        }
    }

    @Transactional
    public void processSingle(WebhookDelivery d) {
        d.setStatus("IN_PROGRESS");
        deliveryRepository.save(d);

            try {
            // call paymentService to process webhook using stored signature
            var maybe = paymentService.handleWebhook(d.getPaymentId(), parseStatusFromPayload(d.getPayload()), d.getSignature(), d.getIdempotencyKey());
            if (maybe.isPresent()) {
                d.setStatus("COMPLETED");
                d.setAttempts(d.getAttempts() + 1);
                deliveryRepository.save(d);
                return;
            } else {
                throw new RuntimeException("processing rejected");
            }
        } catch (Exception ex) {
            int attempts = d.getAttempts() + 1;
            d.setAttempts(attempts);
            if (attempts >= maxAttempts) {
                d.setStatus("FAILED");
            } else {
                d.setStatus("FAILED");
                long backoff = computeBackoff(attempts);
                d.setNextAttemptAt(OffsetDateTime.now().plus(Duration.ofMillis(backoff)));
            }
            d.setLastError(ex.getMessage());
            deliveryRepository.save(d);
        }
    }

    private long computeBackoff(int attempts) {
        // exponential backoff: base * 2^(attempts-1)
        return baseBackoffMs * (1L << Math.max(0, attempts - 1));
    }

    private String parseStatusFromPayload(String payload) {
        // simple heuristic: look for COMPLETED or FAILED in payload
        if (payload == null) return "COMPLETED";
        if (payload.contains("COMPLETED")) return "COMPLETED";
        if (payload.contains("FAILED")) return "FAILED";
        return "COMPLETED";
    }
}

