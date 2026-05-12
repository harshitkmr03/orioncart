package com.orioncart.backend.service;

import com.orioncart.backend.dto.DiscoveryShopResult;
import com.orioncart.backend.dto.NearbyProductSearchResult;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.service.ReviewService.ShopReviewSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class DiscoveryServiceTest {

    private final ShopRepository shopRepository = Mockito.mock(ShopRepository.class);
    private final ProductRepository productRepository = Mockito.mock(ProductRepository.class);
    private final ReviewService reviewService = Mockito.mock(ReviewService.class);
    private DiscoveryService discoveryService;

    @BeforeEach
    void setUp() {
        discoveryService = new DiscoveryService();
        ReflectionTestUtils.setField(discoveryService, "shopRepository", shopRepository);
        ReflectionTestUtils.setField(discoveryService, "productRepository", productRepository);
        ReflectionTestUtils.setField(discoveryService, "reviewService", reviewService);
    }

    @Test
    void discoverNearby_filtersByCategoryAndQuery() {
        Shop groceryShop = createShop(1L, "Fresh Mart", "Grocery", 22.7200, 75.8600);
        Shop bakeryShop = createShop(2L, "Bake House", "Bakery", 22.7300, 75.8700);

        when(shopRepository.findNearby(22.7196, 75.8577, 5.0)).thenReturn(List.of(groceryShop, bakeryShop));
        when(reviewService.getShopReviewSnapshots(List.of(1L, 2L))).thenReturn(Map.of(
                1L, new ShopReviewSnapshot(4.6, 18),
                2L, new ShopReviewSnapshot(3.8, 9)
        ));

        List<DiscoveryShopResult> results = discoveryService.discoverNearby(
                22.7196,
                75.8577,
                5.0,
                "Grocery",
                "fresh",
                "distance",
                4.0
        );

        assertEquals(1, results.size());
        assertEquals("Fresh Mart", results.getFirst().name());
        assertTrue(results.getFirst().distanceKm() >= 0);
    }

    @Test
    void searchNearbyProducts_returnsNearbyMatches() {
        Shop groceryShop = createShop(1L, "Fresh Mart", "Grocery", 22.7200, 75.8600);
        Product milk = createProduct(11L, "Amul Milk 1L", "Dairy", "AMUL-1L", groceryShop);
        milk.setPrice(64);
        milk.setStockQuantity(20);

        when(shopRepository.findNearby(22.7196, 75.8577, 5.0)).thenReturn(List.of(groceryShop));
        when(reviewService.getShopReviewSnapshots(List.of(1L))).thenReturn(Map.of(
                1L, new ShopReviewSnapshot(4.7, 24)
        ));
        when(productRepository.findByShopIdInOrderByNameAsc(List.of(1L))).thenReturn(List.of(milk));

        List<NearbyProductSearchResult> results = discoveryService.searchNearbyProducts(
                "milk",
                22.7196,
                75.8577,
                5.0,
                "Grocery"
        );

        assertEquals(1, results.size());
        assertEquals("Amul Milk 1L", results.getFirst().productName());
        assertEquals("Fresh Mart", results.getFirst().shopName());
    }

    @Test
    void discoverNearby_sortsByRatingDescending() {
        Shop groceryShop = createShop(1L, "Fresh Mart", "Grocery", 22.7200, 75.8600);
        Shop pharmacyShop = createShop(2L, "Care Plus", "Pharmacy", 22.7210, 75.8610);

        when(shopRepository.findNearby(22.7196, 75.8577, 5.0)).thenReturn(List.of(groceryShop, pharmacyShop));
        when(reviewService.getShopReviewSnapshots(List.of(1L, 2L))).thenReturn(Map.of(
                1L, new ShopReviewSnapshot(4.1, 12),
                2L, new ShopReviewSnapshot(4.8, 7)
        ));

        List<DiscoveryShopResult> results = discoveryService.discoverNearby(
                22.7196,
                75.8577,
                5.0,
                null,
                null,
                "rating",
                null
        );

        assertEquals(2, results.size());
        assertEquals("Care Plus", results.getFirst().name());
        assertEquals(4.8, results.getFirst().rating());
    }

    private Shop createShop(Long id, String name, String category, double lat, double lon) {
        Shop shop = new Shop();
        shop.setId(id);
        shop.setName(name);
        shop.setCategory(category);
        shop.setAddress("MG Road");
        shop.setLatitude(lat);
        shop.setLongitude(lon);
        return shop;
    }

    private Product createProduct(Long id, String name, String category, String sku, Shop shop) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setCategory(category);
        product.setSku(sku);
        product.setShop(shop);
        return product;
    }
}

