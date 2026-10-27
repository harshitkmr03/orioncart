package com.orioncart.backend.dto;

import java.util.List;

/**
 * Full cart response returned by GET /api/cart
 */
public class CartResponse {

    private Long cartId;
    private List<CartItemDTO> items;
    private int totalItems;     // sum of all quantities
    private double subtotal;    // sum of lineTotal across all items

    // Getters and Setters
    public Long getCartId() { return cartId; }
    public void setCartId(Long cartId) { this.cartId = cartId; }

    public List<CartItemDTO> getItems() { return items; }
    public void setItems(List<CartItemDTO> items) { this.items = items; }

    public int getTotalItems() { return totalItems; }
    public void setTotalItems(int totalItems) { this.totalItems = totalItems; }

    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
}
