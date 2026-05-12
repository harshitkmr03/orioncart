package com.orioncart.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "webhook_delivery")
public class WebhookDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "status")
    private String status = "PENDING"; // PENDING, IN_PROGRESS, FAILED, COMPLETED

    @Column(name = "attempts")
    private int attempts = 0;

    @Column(name = "next_attempt_at")
    private OffsetDateTime nextAttemptAt = OffsetDateTime.now();

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "payload", length = 4000)
    private String payload;

    @Column(name = "signature", length = 1000)
    private String signature;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public WebhookDelivery() {}

    public Long getId() { return id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; this.updatedAt = OffsetDateTime.now(); }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; this.updatedAt = OffsetDateTime.now(); }
    public OffsetDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(OffsetDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; this.updatedAt = OffsetDateTime.now(); }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; this.updatedAt = OffsetDateTime.now(); }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

