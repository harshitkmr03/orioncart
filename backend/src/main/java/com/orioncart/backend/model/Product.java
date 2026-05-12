package com.orioncart.backend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

@Entity
@Table(name = "product")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;
    private String category;
    private String sku;
    private double price;
    @Column(name = "stock_qty")
    private int stockQuantity;
    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold;
    @Column(name = "last_stock_update_at")
    private LocalDateTime lastStockUpdateAt;
    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    @JsonIgnore
    private Shop shop;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(int stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public Integer getLowStockThreshold() {
        return lowStockThreshold;
    }

    public void setLowStockThreshold(Integer lowStockThreshold) {
        this.lowStockThreshold = lowStockThreshold;
    }

    public LocalDateTime getLastStockUpdateAt() {
        return lastStockUpdateAt;
    }

    public void setLastStockUpdateAt(LocalDateTime lastStockUpdateAt) {
        this.lastStockUpdateAt = lastStockUpdateAt;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Shop getShop() {
        return shop;
    }

    public void setShop(Shop shop) {
        this.shop = shop;
    }

    @Transient
    @JsonProperty("shopId")
    public Long getShopIdJson() {
        return shop != null ? shop.getId() : null;
    }

    @Transient
    @JsonProperty("shopName")
    public String getShopName() {
        return shop != null ? shop.getName() : null;
    }
}

