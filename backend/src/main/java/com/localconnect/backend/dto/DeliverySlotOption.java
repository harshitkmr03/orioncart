package com.localconnect.backend.dto;

public record DeliverySlotOption(
        String id,
        String fulfillmentType,
        String label,
        String windowStart,
        String windowEnd,
        String displayWindow,
        Integer deliveryCharge,
        String cutoffTime,
        boolean available
) {
}
