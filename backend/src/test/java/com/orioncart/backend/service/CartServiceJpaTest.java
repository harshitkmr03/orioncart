package com.orioncart.backend.service;

import com.orioncart.backend.dto.CartItemRequest;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cart-jpa-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(CartService.class)
class CartServiceJpaTest {

    @Autowired private CartService cartService;
    @Autowired private UserRepository userRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;

    private Long userId;
    private Long productId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setEmail("cart-test@example.invalid");
        user.setPassword("not-a-real-password");
        user.setRole(User.Role.CUSTOMER);
        userId = userRepository.saveAndFlush(user).getId();

        Shop shop = new Shop();
        shop.setName("Cart Test Shop");
        shop = shopRepository.saveAndFlush(shop);

        Product product = new Product();
        product.setName("Cart Test Product");
        product.setPrice(10.25);
        product.setStockQuantity(8);
        product.setShop(shop);
        productId = productRepository.saveAndFlush(product).getId();
    }

    @Test
    void persistsMutationsAndReturnsCurrentProductPrice() {
        CartItemRequest request = new CartItemRequest();
        request.setProductId(productId);
        request.setQuantity(2);
        request.setPrice(0.01);

        CartResponse added = cartService.addItem(userId, request);
        assertEquals(2, added.getTotalItems());
        assertEquals(20.50, added.getSubtotal());

        CartResponse updated = cartService.updateQuantity(userId, productId, 3);
        assertEquals(3, updated.getItems().getFirst().getQuantity());

        Product product = productRepository.findById(productId).orElseThrow();
        product.setPrice(11.00);
        productRepository.saveAndFlush(product);

        CartResponse refreshed = cartService.getCart(userId);
        assertEquals(33.00, refreshed.getSubtotal());
        assertTrue(refreshed.getItems().getFirst().isPriceChanged());

        CartResponse removed = cartService.removeItem(userId, productId);
        assertTrue(removed.getItems().isEmpty());

        cartService.clearCart(userId);
        assertFalse(cartService.getCart(userId).getItems().stream().findAny().isPresent());
    }
}
