package com.localconnect.backend.dto;

public record LoyaltyBalanceDTO(
        int pointsBalance,
        int lifetimePoints,
        String tier,
        String referralCode
) {
}
