package com.localconnect.backend.dto;

import java.time.LocalDateTime;

public record NotificationDTO(
        Long id,
        String type,
        String title,
        String message,
        String link,
        boolean read,
        LocalDateTime createdAt
) {
}
