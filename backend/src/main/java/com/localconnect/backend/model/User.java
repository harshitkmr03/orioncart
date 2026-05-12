package com.localconnect.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @jakarta.persistence.Convert(converter = com.localconnect.backend.converter.RoleConverter.class)
    private Role role; // CUSTOMER, SHOPKEEPER

    @Column(name = "name")
    private String name;

    @Column(name = "shop_name")
    private String shopName;

    @Column(name = "phone_verified")
    private Boolean phoneVerified;

    @Column(name = "referral_code", unique = true)
    private String referralCode;

    @Column(name = "loyalty_tier")
    private String loyaltyTier;

    @Transient
    private String referredByCode;

    public enum Role {
        CUSTOMER, SHOPKEEPER;

        @com.fasterxml.jackson.annotation.JsonCreator
        public static Role fromString(String key) {
            if (key == null) return null;
            String v = key.trim().toUpperCase();
            switch (v) {
                case "CUSTOMER":
                case "CONSUMER": // legacy frontend value
                case "BUYER":
                    return CUSTOMER;
                case "SHOPKEEPER":
                case "SELLER":
                    return SHOPKEEPER;
                default:
                    throw new IllegalArgumentException("Unknown role: " + key);
            }
        }

        @com.fasterxml.jackson.annotation.JsonValue
        public String toValue() { return this.name(); }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
    
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShopName() {
        return shopName;
    }

    public void setShopName(String shopName) {
        this.shopName = shopName;
    }

    public Boolean getPhoneVerified() {
        return phoneVerified;
    }

    public void setPhoneVerified(Boolean phoneVerified) {
        this.phoneVerified = phoneVerified;
    }

    public String getReferralCode() {
        return referralCode;
    }

    public void setReferralCode(String referralCode) {
        this.referralCode = referralCode;
    }

    public String getLoyaltyTier() {
        return loyaltyTier;
    }

    public void setLoyaltyTier(String loyaltyTier) {
        this.loyaltyTier = loyaltyTier;
    }

    public String getReferredByCode() {
        return referredByCode;
    }

    public void setReferredByCode(String referredByCode) {
        this.referredByCode = referredByCode;
    }
}
