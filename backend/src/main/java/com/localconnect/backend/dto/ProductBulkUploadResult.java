package com.localconnect.backend.dto;

import java.util.List;

public record ProductBulkUploadResult(
        int totalRows,
        int successCount,
        int errorCount,
        List<ProductBulkUploadError> errors
) {
}
