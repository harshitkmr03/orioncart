package com.localconnect.backend.dto;

public record CouponValidationResponse(
        boolean valid,
        String code,
        String message,
        double discountAmount,
        double discountedSubtotal
) {
}
