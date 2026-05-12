package com.localconnect.backend.dto;

import java.time.LocalDateTime;

public record LoyaltyTransactionDTO(
        Long id,
        int pointsChange,
        String transactionType,
        Long referenceId,
        String description,
        LocalDateTime createdAt
) {
}
