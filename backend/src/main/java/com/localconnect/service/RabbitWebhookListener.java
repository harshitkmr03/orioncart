package com.localconnect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.localconnect.domain.WebhookDelivery;
import com.localconnect.repository.WebhookDeliveryRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Component
public class RabbitWebhookListener {

    private final WebhookDeliveryRepository deliveryRepository;
    private final WebhookQueueService queueService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RabbitWebhookListener(WebhookDeliveryRepository deliveryRepository, WebhookQueueService queueService) {
        this.deliveryRepository = deliveryRepository;
        this.queueService = queueService;
    }

    @RabbitListener(queues = "webhook.delivery")
    @Transactional
    public void receive(String messageJson) {
        try {
            Map<String,Object> msg = objectMapper.readValue(messageJson, new TypeReference<>(){});
            Object idObj = msg.get("deliveryId");
            Long id = idObj == null ? null : Long.valueOf(String.valueOf(idObj));
            if (id != null) {
                Optional<WebhookDelivery> maybe = deliveryRepository.findById(id);
                maybe.ifPresent(queueService::processSingle);
            }
        } catch (Exception ex) {
            // let RabbitMQ handle retries by throwing
            throw new RuntimeException(ex);
        }
    }
}
