package com.localconnect.repository;

import com.localconnect.domain.PaymentWebhook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentWebhookRepository extends JpaRepository<PaymentWebhook, Long> {
    Optional<PaymentWebhook> findByIdempotencyKey(String key);
}
