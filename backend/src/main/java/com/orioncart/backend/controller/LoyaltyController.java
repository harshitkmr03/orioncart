package com.orioncart.backend.controller;

import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.LoyaltyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LoyaltyController {

    @Autowired
    private AuthService authService;

    @Autowired
    private LoyaltyService loyaltyService;

    @GetMapping("/loyalty/balance")
    public ResponseEntity<?> getBalance(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(loyaltyService.getBalance(userId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping("/loyalty/transactions")
    public ResponseEntity<?> getTransactions(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(loyaltyService.getTransactions(userId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping("/referrals/my-code")
    public ResponseEntity<?> getMyCode(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> {
                    var balance = loyaltyService.getBalance(userId);
                    return ResponseEntity.ok(Map.of("referralCode", balance.referralCode(), "tier", balance.tier()));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping("/referrals/history")
    public ResponseEntity<?> getReferralHistory(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(loyaltyService.getReferralHistory(userId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }
}

