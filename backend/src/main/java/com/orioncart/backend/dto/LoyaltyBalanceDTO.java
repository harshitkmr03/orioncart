package com.orioncart.backend.dto;

public record LoyaltyBalanceDTO(
        int pointsBalance,
        int lifetimePoints,
        String tier,
        String referralCode
) {
}

