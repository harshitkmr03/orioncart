package com.orioncart.backend.model;

import com.orioncart.backend.converter.StringListConverter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "disputes")
public class Dispute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    private String reason;

    private String description;

    @Convert(converter = StringListConverter.class)
    @Column(name = "evidence_image_urls", columnDefinition = "TEXT")
    private List<String> evidenceImageUrls;

    private String status;

    @Column(name = "shopkeeper_response")
    private String shopkeeperResponse;

    @Column(name = "shopkeeper_responded_at")
    private LocalDateTime shopkeeperRespondedAt;

    @Column(name = "admin_resolution")
    private String adminResolution;

    @Column(name = "refund_issued")
    private Boolean refundIssued;

    @Column(name = "raised_at")
    private LocalDateTime raisedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public User getCustomer() {
        return customer;
    }

    public void setCustomer(User customer) {
        this.customer = customer;
    }

    public Shop getShop() {
        return shop;
    }

    public void setShop(Shop shop) {
        this.shop = shop;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getEvidenceImageUrls() {
        return evidenceImageUrls;
    }

    public void setEvidenceImageUrls(List<String> evidenceImageUrls) {
        this.evidenceImageUrls = evidenceImageUrls;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getShopkeeperResponse() {
        return shopkeeperResponse;
    }

    public void setShopkeeperResponse(String shopkeeperResponse) {
        this.shopkeeperResponse = shopkeeperResponse;
    }

    public LocalDateTime getShopkeeperRespondedAt() {
        return shopkeeperRespondedAt;
    }

    public void setShopkeeperRespondedAt(LocalDateTime shopkeeperRespondedAt) {
        this.shopkeeperRespondedAt = shopkeeperRespondedAt;
    }

    public String getAdminResolution() {
        return adminResolution;
    }

    public void setAdminResolution(String adminResolution) {
        this.adminResolution = adminResolution;
    }

    public Boolean getRefundIssued() {
        return refundIssued;
    }

    public void setRefundIssued(Boolean refundIssued) {
        this.refundIssued = refundIssued;
    }

    public LocalDateTime getRaisedAt() {
        return raisedAt;
    }

    public void setRaisedAt(LocalDateTime raisedAt) {
        this.raisedAt = raisedAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}

