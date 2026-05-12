package com.localconnect.backend.dto;

public record ProductBulkUploadError(int row, String sku, String error) {
}
