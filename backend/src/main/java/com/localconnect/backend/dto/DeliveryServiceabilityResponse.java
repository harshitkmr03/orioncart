package com.localconnect.backend.dto;

public record DeliveryServiceabilityResponse(
        boolean serviceable,
        Integer estimatedMinutes,
        String partner,
        Integer deliveryCharge,
        Long nearestShopId,
        String nearestShopName,
        String message
) {
}
