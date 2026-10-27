package com.orioncart.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LoyaltyRedemptionPreviewRequest(
        @NotNull @Min(0) Integer requestedPoints,
        String couponCode
) {
}
