package com.orioncart.backend.controller;

import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.UserRepository;
import com.orioncart.backend.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:passwordresettestdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class PasswordResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String testEmail;
    private final String initialPassword = "initialPassword123";

    @BeforeEach
    void setUp() {
        String testId = UUID.randomUUID().toString().substring(0, 8);
        testEmail = "reset-user-" + testId + "@test.invalid";

        User user = new User();
        user.setName("Reset Test User");
        user.setEmail(testEmail);
        user.setPassword(passwordEncoder.encode(initialPassword));
        user.setRole(User.Role.CUSTOMER);
        userRepository.saveAndFlush(user);
    }

    @Test
    void sendOtpToExistingUserSucceeds() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void sendOtpToNonExistentUserReturnsNotFound() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown-user@test.invalid\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void resetPasswordWithInvalidOtpFails() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"otp\":\"000000\",\"newPassword\":\"newSecret123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fullOtpPasswordResetCycleAllowsLoginWithNewPasswordAndInvalidatesOtp() throws Exception {
        // 1. Request OTP
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk());

        String generatedOtp = passwordResetService.getOtpForTesting(testEmail).orElseThrow();
        assertTrue(generatedOtp.matches("^\\d{6}$"), "Generated OTP must be 6 digits");

        // 2. Verify OTP endpoint
        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"otp\":\"" + generatedOtp + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        // 3. Reset password
        String newPassword = "updatedPassword999";
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"otp\":\"" + generatedOtp + "\",\"newPassword\":\"" + newPassword + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // 4. Verify old password no longer works for login
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"password\":\"" + initialPassword + "\"}"))
                .andExpect(status().isUnauthorized());

        // 5. Verify new password successfully logs in
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"password\":\"" + newPassword + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(testEmail));

        // 6. Verify OTP replay fails
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\",\"otp\":\"" + generatedOtp + "\",\"newPassword\":\"anotherPassword\"}"))
                .andExpect(status().isBadRequest());
    }
}
