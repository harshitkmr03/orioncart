package com.orioncart.backend.service;

import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.OrderItem;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.repository.OrderRepository;
import com.orioncart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LoyaltyService loyaltyService;

    @Autowired
    private NotificationService notificationService;

    @org.springframework.transaction.annotation.Transactional
    public Order createOrder(Order order) {
        order.setStatus(Order.OrderStatus.PENDING);
        order.setCreatedAt(java.time.LocalDateTime.now());
        if ((order.getContactName() == null || order.getContactName().isBlank()) && order.getCustomer() != null) {
            order.setContactName(order.getCustomer().getName());
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Order must contain items");
        }

        // Reserve stock with row-level locks and compute item prices
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Each order item must reference a valid product id");
            }

            Long productId = item.getProduct().getId();
            Product product = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Product not found: " + productId));

            if (product.getStockQuantity() < item.getQuantity()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Insufficient stock for product id: " + productId);
            }

            int previousStock = product.getStockQuantity();
            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            product.setLastStockUpdateAt(LocalDateTime.now());
            Product savedProduct = productRepository.save(product);
            notificationService.notifyLowStockIfNeeded(savedProduct, previousStock);

            item.setPrice(product.getPrice());
            item.setShopId(product.getShop() != null ? product.getShop().getId() : null);
            item.setOrder(order);
        }

        // Save order atomically (items are cascaded)
        Order saved = orderRepository.save(order);
        notificationService.notifyOrderPlaced(saved);
        return saved;
    }

    public List<Order> getOrdersByBuyer(Long buyerId) {
        return orderRepository.findByCustomer_IdOrderByCreatedAtDesc(buyerId);
    }

    public List<Order> getOrdersByShop(Long shopId) {
        // Find orders that contain at least one OrderItem with matching shopId
        return orderRepository.findAll().stream()
                .filter(o -> o.getItems() != null && o.getItems().stream().anyMatch(it -> shopId.equals(it.getShopId())))
                .collect(Collectors.toList());
    }

    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public Order updateStatus(Long orderId, Order.OrderStatus status) {
        Order order = getOrderById(orderId);
        Order.OrderStatus previousStatus = order.getStatus();
        log.info("Updating order id {} status to {}", orderId, status);
        order.setStatus(status);
        Order saved = orderRepository.save(order);
        if (status == Order.OrderStatus.COMPLETED && previousStatus != Order.OrderStatus.COMPLETED) {
            loyaltyService.awardForCompletedOrder(saved);
        }
        notificationService.notifyOrderStatusChanged(saved, previousStatus);
        log.info("Order {} status updated to {}", saved.getId(), saved.getStatus());
        return saved;
    }
}

