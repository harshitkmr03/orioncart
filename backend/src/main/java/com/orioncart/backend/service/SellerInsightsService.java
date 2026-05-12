package com.orioncart.backend.service;

import com.orioncart.backend.dto.OrderSlipDTO;
import com.orioncart.backend.dto.OrderSlipItemDTO;
import com.orioncart.backend.dto.SellerOverviewDTO;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class SellerInsightsService {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ReviewService reviewService;

    public SellerOverviewDTO getOverview(Long shopId, LocalDate date) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        LocalDate targetDate = date == null ? LocalDate.now() : date;
        List<Order> orders = orderService.getOrdersByShop(shop.getId());

        double todaysSales = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().equals(targetDate))
                .filter(order -> order.getStatus() == Order.OrderStatus.CONFIRMED
                        || order.getStatus() == Order.OrderStatus.READY
                        || order.getStatus() == Order.OrderStatus.COMPLETED)
                .mapToDouble(Order::getTotalAmount)
                .sum();

        int pendingOrders = (int) orders.stream()
                .filter(order -> order.getStatus() == Order.OrderStatus.PENDING || order.getStatus() == Order.OrderStatus.CONFIRMED)
                .count();

        int lowStockProducts = (int) productRepository.findByShopIdOrderByNameAsc(shop.getId()).stream()
                .filter(product -> product.getStockQuantity() <= (product.getLowStockThreshold() == null ? 5 : product.getLowStockThreshold()))
                .count();

        ReviewService.ShopReviewSnapshot snapshot = reviewService.getShopReviewSnapshot(shop.getId());

        return new SellerOverviewDTO(
                roundCurrency(todaysSales),
                pendingOrders,
                lowStockProducts,
                snapshot.averageRating(),
                snapshot.reviewCount()
        );
    }

    public OrderSlipDTO getOrderSlip(Long orderId) {
        Order order = orderService.getOrderById(orderId);
        return new OrderSlipDTO(
                order.getId(),
                order.getContactName(),
                order.getContactPhone(),
                order.getFulfillmentType() != null ? order.getFulfillmentType().name() : null,
                order.getScheduledSlot(),
                order.getScheduleTime(),
                order.getDeliveryAddress(),
                order.getStatus() != null ? order.getStatus().name() : null,
                order.getSubtotalAmount(),
                order.getTaxAmount(),
                order.getDeliveryCharge(),
                order.getTotalAmount(),
                order.getNote(),
                order.getCreatedAt(),
                order.getItems() == null ? List.of() : order.getItems().stream()
                        .map(item -> new OrderSlipItemDTO(
                                item.getProduct() != null ? item.getProduct().getId() : null,
                                item.getProduct() != null ? item.getProduct().getName() : null,
                                item.getQuantity(),
                                item.getPrice()
                        ))
                        .toList()
        );
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

