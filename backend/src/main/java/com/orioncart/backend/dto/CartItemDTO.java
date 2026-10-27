package com.orioncart.backend.dto;

/**
 * A single cart line item returned to the frontend.
 * Mirrors the shape of a localStorage cart item so the frontend needs minimal changes.
 */
public class CartItemDTO {

    private Long id;          // cart_item.id (useful for direct mutations)
    private Long productId;
    private String name;       // product name  (mapped as 'name' to match localStorage shape)
    private String description;
    private String imageUrl;
    private Long shopId;
    private String shopName;
    private int quantity;
    private double price;
    private double lineTotal;  // quantity * price
    private int availableStock;
    private boolean priceChanged;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public double getLineTotal() { return lineTotal; }
    public void setLineTotal(double lineTotal) { this.lineTotal = lineTotal; }

    public int getAvailableStock() { return availableStock; }
    public void setAvailableStock(int availableStock) { this.availableStock = availableStock; }

    public boolean isPriceChanged() { return priceChanged; }
    public void setPriceChanged(boolean priceChanged) { this.priceChanged = priceChanged; }
}
