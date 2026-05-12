package com.orioncart.service;

import com.orioncart.domain.Payment;
import com.orioncart.repository.PaymentRepository;
import com.orioncart.repository.PaymentWebhookRepository;
import com.orioncart.domain.PaymentWebhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Value("${PAYMENT_WEBHOOK_SECRET:${JWT_SECRET:}}")
    private String webhookSecret;

    private final PaymentWebhookRepository webhookRepository;

    public PaymentService(PaymentRepository paymentRepository, PaymentWebhookRepository webhookRepository) {
        this.paymentRepository = paymentRepository;
        this.webhookRepository = webhookRepository;
    }

    /**
     * Create a stubbed payment intent and return the saved Payment.
     */
    public Payment createPaymentIntent(Long orderId, Long amountCents, String currency) {
        Payment p = new Payment();
        p.setOrderId(orderId);
        p.setAmountCents(amountCents);
        p.setCurrency(currency == null ? "INR" : currency);
        p.setStatus("PENDING");
        // providerPaymentId will be set when the provider returns it (stubbed here)
        p.setProviderPaymentId("stub-provider-" + System.currentTimeMillis());
        return paymentRepository.save(p);
    }

    /**
     * Handle incoming webhook payload; validate signature and update payment status.
     */
    @Transactional
    public Optional<Payment> handleWebhook(Long paymentId, String status, String signature, String idempotencyKey) {
        // idempotency handling: if idempotencyKey provided and already processed, return existing
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = webhookRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                // already processed
                if (existing.get().isProcessed()) {
                    return paymentRepository.findById(existing.get().getPaymentId());
                }
                // otherwise, fall through and attempt processing
            } else {
                PaymentWebhook wh = new PaymentWebhook();
                wh.setIdempotencyKey(idempotencyKey);
                wh.setPaymentId(paymentId);
                webhookRepository.save(wh);
            }
        }

        // very simple signature check: header must equal webhookSecret when set
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signature == null || !signature.equals(webhookSecret)) {
                return Optional.empty();
            }
        }

        Optional<Payment> maybe = paymentRepository.findById(paymentId);
        maybe.ifPresent(p -> p.setStatus(status));
        var saved = maybe.map(paymentRepository::save);

        // mark webhook processed if we created/used an idempotency record
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            webhookRepository.findByIdempotencyKey(idempotencyKey).ifPresent(wh -> {
                wh.setProcessed(true);
                webhookRepository.save(wh);
            });
        }

        return saved;
    }
}

