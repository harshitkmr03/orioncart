package com.orioncart.controller;

import com.orioncart.dto.OrderItemDto;
import com.orioncart.dto.OrderRequest;
import com.orioncart.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error","items required"));
        }

        try {
            var map = req.getItems().stream()
                    .collect(Collectors.toMap(OrderItemDto::getProductId, OrderItemDto::getQuantity, Integer::sum));
            orderService.reserveMultiple(map);
            return ResponseEntity.created(URI.create("/api/orders/1")).body(Map.of("status","reserved"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}

