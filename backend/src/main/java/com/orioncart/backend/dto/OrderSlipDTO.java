package com.orioncart.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrderSlipDTO(
        Long orderId,
        String customerName,
        String customerPhone,
        String fulfillmentType,
        String scheduledSlot,
        String scheduleTime,
        String deliveryAddress,
        String status,
        double subtotalAmount,
        double taxAmount,
        double deliveryCharge,
        double totalAmount,
        String note,
        LocalDateTime createdAt,
        List<OrderSlipItemDTO> items
) {
}

