package com.localconnect.backend.dto;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long shopId,
        Long productId,
        Long orderId,
        Long buyerId,
        String buyerName,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {
}
