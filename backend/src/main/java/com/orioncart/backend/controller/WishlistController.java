package com.orioncart.backend.controller;

import com.orioncart.backend.dto.WishlistItemDTO;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "*")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<?> getWishlist(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(wishlistService.getWishlist(userId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<?> addToWishlist(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long productId
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(wishlistService.addToWishlist(userId, productId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<?> removeFromWishlist(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long productId
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(wishlistService.removeFromWishlist(userId, productId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }
}

