package com.orioncart.backend.controller;

import com.orioncart.backend.dto.CartItemRequest;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * REST controller for server-side cart persistence.
 *
 * All endpoints require a valid X-Auth-Token header (same pattern as the rest of the app).
 *
 * Endpoints:
 *   GET    /api/cart                     – get current user's cart
 *   POST   /api/cart/items               – add / merge item
 *   PUT    /api/cart/items/{productId}   – update quantity (qty=0 removes)
 *   DELETE /api/cart/items/{productId}   – remove specific item
 *   DELETE /api/cart                     – clear entire cart
 *   POST   /api/cart/merge               – merge guest localStorage cart on login
 */
@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "*")
public class CartController {

    @Autowired
    private CartService cartService;

    @Autowired
    private AuthService authService;

    // ----------------------------------------------------------------
    // GET /api/cart
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<?> getCart(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        CartResponse cart = cartService.getCart(userIdOpt.get());
        return ResponseEntity.ok(cart);
    }

    // ----------------------------------------------------------------
    // POST /api/cart/items
    // ----------------------------------------------------------------
    @PostMapping("/items")
    public ResponseEntity<?> addItem(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody CartItemRequest request) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        try {
            CartResponse cart = cartService.addItem(userIdOpt.get(), request);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("message", ex.getMessage()));
        }
    }

    // ----------------------------------------------------------------
    // PUT /api/cart/items/{productId}?qty=N
    // ----------------------------------------------------------------
    @PutMapping("/items/{productId}")
    public ResponseEntity<?> updateQuantity(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long productId,
            @RequestParam int qty) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        try {
            CartResponse cart = cartService.updateQuantity(userIdOpt.get(), productId, qty);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("message", ex.getMessage()));
        }
    }

    // ----------------------------------------------------------------
    // DELETE /api/cart/items/{productId}
    // ----------------------------------------------------------------
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long productId) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        CartResponse cart = cartService.removeItem(userIdOpt.get(), productId);
        return ResponseEntity.ok(cart);
    }

    // ----------------------------------------------------------------
    // DELETE /api/cart  — clear entire cart
    // ----------------------------------------------------------------
    @DeleteMapping
    public ResponseEntity<?> clearCart(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        cartService.clearCart(userIdOpt.get());
        return ResponseEntity.ok(Collections.singletonMap("message", "Cart cleared"));
    }

    // ----------------------------------------------------------------
    // POST /api/cart/merge  — merge guest cart on login
    // Body: List<CartItemRequest>
    // ----------------------------------------------------------------
    @PostMapping("/merge")
    public ResponseEntity<?> mergeGuestCart(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody List<CartItemRequest> guestItems) {

        Optional<Long> userIdOpt = authService.getUserIdForToken(token);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "Authentication required"));
        }

        try {
            CartResponse cart = cartService.mergeGuestCart(userIdOpt.get(), guestItems);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("message", ex.getMessage()));
        }
    }
}
