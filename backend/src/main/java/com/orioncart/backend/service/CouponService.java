package com.orioncart.backend.service;

import com.orioncart.backend.dto.CouponValidationResponse;
import com.orioncart.backend.model.Coupon;
import com.orioncart.backend.repository.CouponRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CouponService {

    @Autowired
    private CouponRepository couponRepository;

    @PostConstruct
    public void seedDefaultCoupons() {
        if (couponRepository.count() > 0) {
            return;
        }

        Coupon welcome = new Coupon();
        welcome.setCode("WELCOME10");
        welcome.setDiscountType(Coupon.DiscountType.PERCENTAGE);
        welcome.setDiscountValue(10);
        welcome.setMinOrderValue(200);
        welcome.setCurrentUses(0);
        welcome.setScope("PLATFORM");
        welcome.setActive(true);
        welcome.setCreatedAt(LocalDateTime.now());
        couponRepository.save(welcome);

        Coupon local = new Coupon();
        local.setCode("LOCAL50");
        local.setDiscountType(Coupon.DiscountType.FLAT);
        local.setDiscountValue(50);
        local.setMinOrderValue(500);
        local.setCurrentUses(0);
        local.setScope("PLATFORM");
        local.setActive(true);
        local.setCreatedAt(LocalDateTime.now());
        couponRepository.save(local);
    }

    public CouponValidationResponse validateCoupon(String code, double subtotal, Collection<Long> shopIds) {
        if (code == null || code.isBlank()) {
            return new CouponValidationResponse(false, null, "Coupon code is required", 0, roundCurrency(subtotal));
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found"));

        if (!Boolean.TRUE.equals(coupon.getActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon is inactive");
        }

        LocalDateTime now = LocalDateTime.now();
        if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon is not active yet");
        }
        if (coupon.getValidUntil() != null && now.isAfter(coupon.getValidUntil())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon has expired");
        }
        if (subtotal < coupon.getMinOrderValue()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order does not meet coupon minimum value");
        }
        if (coupon.getMaxUses() != null && coupon.getCurrentUses() != null && coupon.getCurrentUses() >= coupon.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon usage limit reached");
        }

        Set<Long> orderShopIds = new HashSet<>();
        if (shopIds != null) {
            orderShopIds.addAll(shopIds);
        }

        if ("SHOP".equalsIgnoreCase(safe(coupon.getScope()))
                && coupon.getShopId() != null
                && !orderShopIds.contains(coupon.getShopId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon is not valid for this shop");
        }

        double discountAmount = calculateDiscount(coupon, subtotal);
        double discountedSubtotal = Math.max(0, roundCurrency(subtotal - discountAmount));

        return new CouponValidationResponse(
                true,
                coupon.getCode().toUpperCase(Locale.ROOT),
                "Coupon applied",
                discountAmount,
                discountedSubtotal
        );
    }

    public double calculateDiscount(String code, double subtotal, Collection<Long> shopIds) {
        CouponValidationResponse validation = validateCoupon(code, subtotal, shopIds);
        return validation.discountAmount();
    }

    public void markCouponUsed(String code) {
        if (code == null || code.isBlank()) {
            return;
        }

        couponRepository.findByCodeForUpdate(code.trim()).ifPresent(coupon -> {
            coupon.setCurrentUses((coupon.getCurrentUses() == null ? 0 : coupon.getCurrentUses()) + 1);
            couponRepository.save(coupon);
        });
    }

    private double calculateDiscount(Coupon coupon, double subtotal) {
        double discountAmount = coupon.getDiscountType() == Coupon.DiscountType.PERCENTAGE
                ? subtotal * (coupon.getDiscountValue() / 100.0)
                : coupon.getDiscountValue();
        return Math.min(roundCurrency(discountAmount), roundCurrency(subtotal));
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}

