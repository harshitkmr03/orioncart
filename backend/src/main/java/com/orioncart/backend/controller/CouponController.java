package com.orioncart.backend.controller;

import com.orioncart.backend.dto.CouponValidationResponse;
import com.orioncart.backend.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @GetMapping("/validate")
    public CouponValidationResponse validateCoupon(
            @RequestParam String code,
            @RequestParam double subtotal,
            @RequestParam(required = false) String shopIds
    ) {
        Set<Long> parsedShopIds = shopIds == null || shopIds.isBlank()
                ? Set.of()
                : Arrays.stream(shopIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::parseLong)
                .collect(Collectors.toSet());

        return couponService.validateCoupon(code, subtotal, parsedShopIds);
    }
}

