package com.localconnect.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DisputeResponse(
        Long id,
        Long orderId,
        Long shopId,
        String shopName,
        String reason,
        String description,
        List<String> evidenceImageUrls,
        String status,
        String shopkeeperResponse,
        Boolean refundIssued,
        LocalDateTime raisedAt,
        LocalDateTime resolvedAt
) {
}
