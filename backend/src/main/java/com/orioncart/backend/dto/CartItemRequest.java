package com.orioncart.backend.dto;

/**
 * Incoming cart item. Price and shop id are accepted for older clients but are
 * ignored; the server derives both from the product record.
 */
public class CartItemRequest {

    private Long productId;
    private Long shopId;
    private int quantity;
    private double price;

    // Getters and Setters
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}
