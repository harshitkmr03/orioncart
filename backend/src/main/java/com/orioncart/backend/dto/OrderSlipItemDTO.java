package com.orioncart.backend.dto;

public record OrderSlipItemDTO(
        Long productId,
        String productName,
        int quantity,
        double price
) {
}

