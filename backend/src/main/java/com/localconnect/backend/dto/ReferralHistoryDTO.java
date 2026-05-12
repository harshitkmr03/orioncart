package com.localconnect.backend.dto;

import java.time.LocalDateTime;

public record ReferralHistoryDTO(
        Long id,
        Long refereeId,
        String refereeName,
        String referralCode,
        String status,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {
}
