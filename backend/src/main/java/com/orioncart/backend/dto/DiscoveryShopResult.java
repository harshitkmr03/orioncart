package com.orioncart.backend.dto;

public record DiscoveryShopResult(
        Long id,
        String name,
        String category,
        String address,
        Double latitude,
        Double longitude,
        String image,
        Double distanceKm,
        Integer etaMinutes,
        String statusLabel,
        Double rating,
        Integer reviewCount
) {
}

