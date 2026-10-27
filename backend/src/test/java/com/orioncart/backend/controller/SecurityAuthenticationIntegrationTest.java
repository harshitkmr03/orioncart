package com.orioncart.backend.controller;

import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.repository.UserRepository;
import com.orioncart.backend.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:securitytestdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class SecurityAuthenticationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private AuthService authService;

    private String customerToken;
    private String shopkeeperToken;

    @BeforeEach
    void setUp() {
        String testId = java.util.UUID.randomUUID().toString().substring(0, 8);

        User customer = new User();
        customer.setName("Security Customer");
        customer.setEmail("customer-" + testId + "@security.test");
        customer.setPassword("hashedpass");
        customer.setRole(User.Role.CUSTOMER);
        customer = userRepository.saveAndFlush(customer);
        customerToken = authService.createTokenForUser(customer.getId());

        User shopkeeper = new User();
        shopkeeper.setName("Security Shopkeeper");
        shopkeeper.setEmail("shopkeeper-" + testId + "@security.test");
        shopkeeper.setPassword("hashedpass");
        shopkeeper.setRole(User.Role.SHOPKEEPER);
        shopkeeper = userRepository.saveAndFlush(shopkeeper);
        shopkeeperToken = authService.createTokenForUser(shopkeeper.getId());
    }

    @Test
    void unauthenticatedAccessToCartReturns401WithStandardMessage() throws Exception {
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void invalidTokenAccessReturns401WithStandardMessage() throws Exception {
        mockMvc.perform(get("/api/cart")
                        .header("X-Auth-Token", "invalid-token-value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void authenticatedCustomerCanAccessCartViaXAuthToken() throws Exception {
        mockMvc.perform(get("/api/cart")
                        .header("X-Auth-Token", customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void authenticatedCustomerCanAccessCartViaBearerHeader() throws Exception {
        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void publicDiscoveryEndpointsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/discovery/all"))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotCreateShopWithoutShopkeeperRole() throws Exception {
        mockMvc.perform(post("/api/shops")
                        .header("X-Auth-Token", customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Unauthorized Shop\",\"category\":\"Grocery\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void shopkeeperCanAccessShopCreation() throws Exception {
        mockMvc.perform(post("/api/shops")
                        .header("X-Auth-Token", shopkeeperToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Authorized Shop\",\"category\":\"Grocery\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Authorized Shop"));
    }
}
