package com.localconnect.backend.dto;

public record SellerOverviewDTO(
        double todaysSalesAmount,
        int pendingOrders,
        int lowStockProducts,
        double averageRating,
        long reviewCount
) {
}
