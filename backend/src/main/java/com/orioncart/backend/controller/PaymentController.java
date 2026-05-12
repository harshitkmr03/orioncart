package com.orioncart.backend.controller;

import com.orioncart.backend.dto.PaymentRequest;
import com.orioncart.backend.dto.UpiPaymentRequest;
import com.orioncart.backend.dto.CodPaymentRequest;
import com.orioncart.backend.mapper.OrderMapper;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.PaymentService;
import com.orioncart.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {
    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private OrderMapper orderMapper;

    @PostMapping("/charge")
    public ResponseEntity<?> charge(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                    @RequestBody PaymentRequest req) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        if (req == null || req.getOrder() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing order payload"));
        }

        // Basic card validation
        String card = req.getCardNumber() != null ? req.getCardNumber().replaceAll("\\s+", "") : "";
        if (!card.matches("\\d{13,19}")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid card number"));
        }

        String cvv = req.getCvv() == null ? "" : req.getCvv();
        if (!cvv.matches("\\d{3,4}")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid CVV"));
        }

        Integer m = req.getExpiryMonth();
        Integer y = req.getExpiryYear();
        if (m == null || y == null || m < 1 || m > 12) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid expiry date"));
        }

        YearMonth now = YearMonth.now();
        YearMonth expiry = YearMonth.of(y, m);
        if (expiry.isBefore(now)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Card expired"));
        }

        Order order = req.getOrder();
        if (order.getTotalAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid order total amount"));
        }

        return authService.getUserIdForToken(token)
                .flatMap(userId -> userService.findById(userId))
                .map(user -> {
                    try {
                        // Attach user
                        order.setCustomer(user);
                        // Simulate charge then create order transactionally
                        Order created = paymentService.processPaymentAndCreateOrder(order);
                        return ResponseEntity.ok(orderMapper.toDTO(created));
                    } catch (Exception ex) {
                        log.error("Payment/Order creation failed for user {}: {}", user.getId(), ex.getMessage(), ex);
                        return ResponseEntity.status(500).body(Map.of("message", "Payment processing failed", "detail", ex.getMessage()));
                    }
                }).orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @PostMapping("/upi")
    public ResponseEntity<?> chargeUpi(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                       @RequestBody UpiPaymentRequest req) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        if (req == null || req.getOrder() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing order payload"));
        }

        String upi = req.getUpiId() == null ? "" : req.getUpiId().trim();
        if (!upi.contains("@") || upi.length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid UPI id"));
        }

        Order order = req.getOrder();
        if (order.getTotalAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid order total amount"));
        }

        return authService.getUserIdForToken(token)
                .flatMap(userId -> userService.findById(userId))
                .map(user -> {
                    try {
                        order.setCustomer(user);
                        // Simulate UPI settlement then create order
                        Order created = paymentService.processPaymentAndCreateOrder(order);
                        return ResponseEntity.ok(orderMapper.toDTO(created));
                    } catch (Exception ex) {
                        log.error("UPI Payment failed for user {}: {}", user.getId(), ex.getMessage(), ex);
                        return ResponseEntity.status(500).body(Map.of("message", "UPI payment processing failed", "detail", ex.getMessage()));
                    }
                }).orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @PostMapping("/cod")
    public ResponseEntity<?> codOrder(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                      @RequestBody CodPaymentRequest req) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        if (req == null || req.getOrder() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing order payload"));
        }

        Order order = req.getOrder();
        if (order.getTotalAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid order total amount"));
        }

        return authService.getUserIdForToken(token)
                .flatMap(userId -> userService.findById(userId))
                .map(user -> {
                    try {
                        order.setCustomer(user);
                        // For COD we still need to validate items and decrement stock
                        Order created = paymentService.processPaymentAndCreateOrder(order);
                        // Set status to PENDING or a COD-specific status after creation
                        created.setStatus(Order.OrderStatus.PENDING);
                        return ResponseEntity.ok(orderMapper.toDTO(created));
                    } catch (Exception ex) {
                        log.error("COD Order failed for user {}: {}", user.getId(), ex.getMessage(), ex);
                        return ResponseEntity.status(500).body(Map.of("message", "COD order processing failed", "detail", ex.getMessage()));
                    }
                }).orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }
}

