package com.orioncart.backend.dto;

public record LoyaltyRedemptionPreviewResponse(
        boolean eligible,
        int requestedPoints,
        int approvedPoints,
        double discountAmount,
        int userCurrentBalance,
        int maxRedeemablePoints,
        double maxDiscountAmount,
        String tier,
        double conversionRate,
        double netSubtotal,
        String message
) {
}
