package com.localconnect.service;

import com.localconnect.domain.Product;
import com.localconnect.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class OrderService {

    private final ProductRepository productRepository;

    public OrderService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    public void reserveProduct(Long productId, int qty) {
        Product p = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        if (p.getStockQuantity() < qty) {
            throw new IllegalStateException("Insufficient stock for product " + productId);
        }

        p.setStockQuantity(p.getStockQuantity() - qty);
        productRepository.save(p);
    }

    /**
     * Reserve multiple items atomically. `items` map of productId -> qty
     */
    @Transactional
    public void reserveMultiple(Map<Long, Integer> items) {
        // To ensure deterministic behavior and all-or-nothing semantics,
        // first load all products with a pessimistic lock, validate availability,
        // then apply updates and persist. This avoids iteration-order-dependent
        // failures in tests and enforces transactional integrity.
        java.util.List<Product> products = new java.util.ArrayList<>();
        for (Long id : items.keySet()) {
            Product p = productRepository.findByIdForUpdate(id)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
            products.add(p);
        }

        // Validate availability
        for (Product p : products) {
            int qty = items.get(p.getId());
            if (p.getStockQuantity() < qty) {
                throw new IllegalStateException("Insufficient stock for product " + p.getId());
            }
        }

        // Apply updates
        for (Product p : products) {
            int qty = items.get(p.getId());
            p.setStockQuantity(p.getStockQuantity() - qty);
            productRepository.save(p);
        }
    }
}
