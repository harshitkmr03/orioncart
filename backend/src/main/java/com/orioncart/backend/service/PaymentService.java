package com.orioncart.backend.service;

import com.orioncart.backend.model.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.model.OrderItem;
import com.orioncart.backend.model.Product;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;


@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private CouponService couponService;

    @Autowired
    private LoyaltyService loyaltyService;

    /**
     * Simulate processing a payment and create the order transactionally.
     * This method is transactional so that if saving the order fails, the simulated
     * payment semantics are rolled back from the perspective of our server state.
     */
    @Transactional
    public Order processPaymentAndCreateOrder(Order order) {
        // Validate items and recompute totals from authoritative product data.
        // Stock reservation/decrement is handled in OrderService#createOrder.
        log.info("Processing simulated payment and validating order (initial amount={})", order.getTotalAmount());

        double computedSubtotal = 0.0;
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }

        for (OrderItem item : order.getItems()) {
            if (item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Invalid quantity for product");
            }
            Long productId = item.getProduct() != null ? item.getProduct().getId() : null;
            if (productId == null) {
                throw new IllegalArgumentException("Missing product id for an order item");
            }

            Optional<Product> maybe = productRepository.findById(productId);
            if (maybe.isEmpty()) {
                throw new IllegalArgumentException("Product with id " + productId + " not found");
            }
            Product prod = maybe.get();

            if (prod.getStockQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for product " + prod.getId());
            }

            // Use authoritative product price and shop id
            item.setProduct(prod);
            item.setPrice(prod.getPrice());
            if (prod.getShop() != null) {
                item.setShopId(prod.getShop().getId());
            }

            computedSubtotal += prod.getPrice() * item.getQuantity();
        }

        computedSubtotal = roundCurrency(computedSubtotal);

        Set<com.orioncart.backend.model.Shop> orderShops = order.getItems().stream()
                .map(OrderItem::getProduct)
                .map(Product::getShop)
                .collect(Collectors.toSet());
        Set<Long> shopIds = orderShops.stream()
                .filter(java.util.Objects::nonNull)
                .map(com.orioncart.backend.model.Shop::getId)
                .collect(Collectors.toSet());

        double couponDiscount = 0.0;
        if (order.getCouponCode() != null && !order.getCouponCode().isBlank()) {
            couponDiscount = couponService.calculateDiscount(order.getCouponCode(), computedSubtotal, shopIds);
        }

        double loyaltyDiscount = 0.0;
        if (order.getCustomer() != null && order.getCustomer().getId() != null) {
            loyaltyDiscount = loyaltyService.previewRedeemedDiscount(
                    order.getCustomer().getId(),
                    order.getLoyaltyPointsRedeemed(),
                    Math.max(0, computedSubtotal - couponDiscount)
            );
        }

        double totalDiscount = Math.min(roundCurrency(couponDiscount + loyaltyDiscount), computedSubtotal);
        double discountedSubtotal = roundCurrency(Math.max(0, computedSubtotal - totalDiscount));

        DeliveryService.PricingBreakdown pricing = deliveryService.calculateOrderPricing(order, orderShops);
        double taxAmount = roundCurrency(discountedSubtotal * 0.05);
        double deliveryCharge = pricing.deliveryCharge() == null ? 0.0 : pricing.deliveryCharge();
        double grandTotal = roundCurrency(discountedSubtotal + taxAmount + deliveryCharge);

        order.setSubtotalAmount(computedSubtotal);
        order.setTaxAmount(taxAmount);
        order.setDeliveryCharge(deliveryCharge);
        order.setDiscountAmount(totalDiscount);
        order.setDeliveryPartner(pricing.partner());
        order.setTotalAmount(grandTotal);

        // Simulate payment (always successful in this demo)
        log.info("Simulated charge successful for amount={} (subtotal={}, discount={}, tax={}, delivery={})", grandTotal, computedSubtotal, totalDiscount, taxAmount, deliveryCharge);

        // Persist order and order items
        Order created = orderService.createOrder(order);
        if (created.getCustomer() != null && created.getCustomer().getId() != null) {
            loyaltyService.consumeRedeemedPoints(created.getCustomer().getId(), created.getLoyaltyPointsRedeemed(), created.getId(), Math.max(0, computedSubtotal - couponDiscount));
        }
        couponService.markCouponUsed(created.getCouponCode());
        log.info("Order persisted with id {} after simulated charge", created.getId());
        return created;
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

