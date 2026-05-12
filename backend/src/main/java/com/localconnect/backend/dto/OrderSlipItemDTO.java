package com.localconnect.backend.dto;

public record OrderSlipItemDTO(
        Long productId,
        String productName,
        int quantity,
        double price
) {
}
