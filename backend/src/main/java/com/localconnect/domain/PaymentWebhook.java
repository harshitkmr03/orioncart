package com.localconnect.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "payment_webhook", indexes = {@Index(name = "idx_webhook_key", columnList = "idempotency_key", unique = true)})
public class PaymentWebhook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = true, unique = true)
    private String idempotencyKey;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "processed")
    private boolean processed = false;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    private OffsetDateTime processedAt;

    public PaymentWebhook() {}

    public Long getId() { return id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
    public boolean isProcessed() { return processed; }
    public void setProcessed(boolean processed) { this.processed = processed; if (processed) this.processedAt = OffsetDateTime.now(); }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getProcessedAt() { return processedAt; }
}
