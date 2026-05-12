package com.orioncart.repository;

import com.orioncart.domain.WebhookDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, Long> {
    List<WebhookDelivery> findTop20ByStatusInAndNextAttemptAtBeforeOrderByNextAttemptAtAsc(List<String> statuses, OffsetDateTime time);
    WebhookDelivery findByIdempotencyKey(String key);
}

