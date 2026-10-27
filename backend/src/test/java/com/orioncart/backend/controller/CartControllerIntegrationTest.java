package com.orioncart.backend.controller;

import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.LoyaltyPoints;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.LoyaltyPointsRepository;
import com.orioncart.backend.repository.LoyaltyTransactionRepository;
import com.orioncart.backend.repository.OrderRepository;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.repository.UserRepository;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.LoyaltyService;
import com.orioncart.backend.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cart-controller-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "jwt.secret=orioncart-test-secret-key-32-characters-long"
})
@AutoConfigureMockMvc
@Transactional
class CartControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private LoyaltyPointsRepository loyaltyPointsRepository;
    @Autowired private LoyaltyTransactionRepository loyaltyTransactionRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private LoyaltyService loyaltyService;
    @Autowired private OrderService orderService;

    private String token;
    private Long userId;
    private Long productId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setEmail("cart-http-test@example.invalid");
        user.setPassword("test-password");
        user.setRole(User.Role.CUSTOMER);
        user = userRepository.saveAndFlush(user);
        userId = user.getId();
        token = authService.createTokenForUser(userId);

        LoyaltyPoints points = new LoyaltyPoints();
        points.setUser(user);
        points.setPointsBalance(5000);
        points.setLifetimePoints(5000);
        points.setTier("GOLD");
        loyaltyPointsRepository.saveAndFlush(points);

        Shop shop = new Shop();
        shop.setName("Cart HTTP Test Shop");
        shop = shopRepository.saveAndFlush(shop);

        Product product = new Product();
        product.setName("Cart HTTP Test Product");
        product.setPrice(10.25);
        product.setStockQuantity(8);
        product.setShop(shop);
        productId = productRepository.saveAndFlush(product).getId();
    }

    @Test
    void authenticatedCartCrudPersistsAndUsesServerPrice() throws Exception {
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/cart/items")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId
                                + ",\"quantity\":2,\"price\":0.01,\"shopId\":999}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.subtotal").value(20.5))
                .andExpect(jsonPath("$.items[0].price").value(10.25));

        mockMvc.perform(get("/api/cart").header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(2));

        mockMvc.perform(put("/api/cart/items/{productId}?qty=3", productId)
                        .header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.subtotal").value(30.75));

        mockMvc.perform(post("/api/loyalty/preview-redemption")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestedPoints\":500}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.approvedPoints").value(500))
                .andExpect(jsonPath("$.discountAmount").value(6.0))
                .andExpect(jsonPath("$.netSubtotal").value(30.75));

        mockMvc.perform(delete("/api/cart/items/{productId}", productId)
                        .header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void cancelledOrderRestoresRedeemedPointsOnlyOnce() {
        Order order = new Order();
        order.setCustomer(userRepository.findById(userId).orElseThrow());
        order.setTotalAmount(100.0);
        order.setLoyaltyPointsRedeemed(500);
        order.setStatus(Order.OrderStatus.PENDING);
        order = orderRepository.saveAndFlush(order);

        loyaltyService.consumeRedeemedPoints(userId, 500, order.getId(), order.getTotalAmount());
        orderService.updateStatus(order.getId(), Order.OrderStatus.CANCELLED);
        orderService.updateStatus(order.getId(), Order.OrderStatus.CANCELLED);

        assertEquals(5000, loyaltyPointsRepository.findByUser_Id(userId).orElseThrow().getPointsBalance());
        assertEquals(1, loyaltyTransactionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .filter(transaction -> "REDEMPTION_REFUND".equals(transaction.getTransactionType()))
                .count());
    }
}
