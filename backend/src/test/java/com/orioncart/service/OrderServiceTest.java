package com.orioncart.service;

import com.orioncart.domain.Product;
import com.orioncart.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

public class OrderServiceTest {

    private ProductRepository repo;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        repo = Mockito.mock(ProductRepository.class);
        orderService = new OrderService(repo);
    }

    @Test
    void reserveProduct_success() {
        Product p = new Product();
        p.setId(1L);
        p.setName("A");
        p.setStockQuantity(10);
        when(repo.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        orderService.reserveProduct(1L, 3);
        assertEquals(7, p.getStockQuantity());
    }

    @Test
    void reserveProduct_insufficient() {
        Product p = new Product();
        p.setId(2L);
        p.setName("B");
        p.setStockQuantity(1);
        when(repo.findByIdForUpdate(2L)).thenReturn(Optional.of(p));

        assertThrows(IllegalStateException.class, () -> orderService.reserveProduct(2L, 5));
    }

    @Test
    void reserveMultiple_allOrNothing() {
        Product p1 = new Product(); p1.setId(1L); p1.setStockQuantity(5);
        Product p2 = new Product(); p2.setId(2L); p2.setStockQuantity(2);
        when(repo.findByIdForUpdate(1L)).thenReturn(Optional.of(p1));
        when(repo.findByIdForUpdate(2L)).thenReturn(Optional.of(p2));

        assertThrows(IllegalStateException.class, () -> orderService.reserveMultiple(Map.of(1L,2,2L,5)));
        // All-or-nothing semantics: when one item is unavailable, no updates should be applied
        assertEquals(5, p1.getStockQuantity());
    }
}

