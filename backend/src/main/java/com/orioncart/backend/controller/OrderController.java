package com.orioncart.backend.controller;

import com.orioncart.backend.dto.OrderSlipDTO;
import com.orioncart.backend.dto.OrderDTO;
import com.orioncart.backend.mapper.OrderMapper;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.UserService;
import com.orioncart.backend.model.User;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.service.OrderService;
import com.orioncart.backend.service.SellerInsightsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @Autowired
    private SellerInsightsService sellerInsightsService;

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                         @RequestBody Order order) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .flatMap(userId -> userService.findById(userId))
                .map(user -> {
                    try {
                        // Attach authenticated user as customer
                        order.setCustomer(user);
                        Order created = orderService.createOrder(order);
                        return ResponseEntity.ok(orderMapper.toDTO(created));
                    } catch (Exception ex) {
                        log.error("Failed to create order for user {}: {}", user.getId(), ex.getMessage(), ex);
                        return ResponseEntity.status(500).body(Map.of("message", "Failed to create order", "detail", ex.getMessage()));
                    }
                }).orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping("/buyer/{buyerId}")
    public List<OrderDTO> getOrdersByBuyer(@PathVariable Long buyerId) {
        List<Order> orders = orderService.getOrdersByBuyer(buyerId);
        return orders.stream().map(orderMapper::toDTO).toList();
    }

    @GetMapping("/shop/{shopId}")
    public List<OrderDTO> getOrdersByShop(@PathVariable Long shopId) {
        List<Order> orders = orderService.getOrdersByShop(shopId);
        return orders.stream().map(orderMapper::toDTO).toList();
    }

    @PutMapping("/{id}/status")
    public OrderDTO updateStatus(@PathVariable Long id, @RequestParam Order.OrderStatus status) {
        Order updated = orderService.updateStatus(id, status);
        return orderMapper.toDTO(updated);
    }

    @GetMapping("/{id}/slip")
    public OrderSlipDTO getOrderSlip(@PathVariable Long id) {
        return sellerInsightsService.getOrderSlip(id);
    }
}

