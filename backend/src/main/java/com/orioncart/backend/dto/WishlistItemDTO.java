package com.orioncart.backend.dto;

import java.time.LocalDateTime;

public record WishlistItemDTO(
        Long productId,
        String productName,
        String category,
        double price,
        Integer stockQuantity,
        String imageUrl,
        Long shopId,
        String shopName,
        LocalDateTime savedAt
) {
}

