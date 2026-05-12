package com.localconnect.backend.dto;

public record NearbyProductSearchResult(
        Long productId,
        String productName,
        String category,
        String sku,
        Double price,
        Integer stockQuantity,
        String imageUrl,
        Long shopId,
        String shopName,
        String shopCategory,
        String shopAddress,
        Double distanceKm,
        Integer etaMinutes
) {
}
