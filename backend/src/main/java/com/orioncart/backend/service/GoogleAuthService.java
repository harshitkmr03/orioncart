package com.orioncart.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orioncart.backend.dto.LoginResponse;
import com.orioncart.backend.dto.UserDTO;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class GoogleAuthService {
    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private LoyaltyService loyaltyService;

    @Autowired(required = false)
    private EmailService emailService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${google.client.id:${GOOGLE_CLIENT_ID:}}")
    private String expectedClientId;

    public LoginResponse authenticateWithGoogle(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google credential token is required");
        }

        try {
            String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential.trim();
            ResponseEntity<String> response = restTemplate.getForEntity(verifyUrl, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
            }

            JsonNode payload = objectMapper.readTree(response.getBody());

            String email = payload.hasNonNull("email") ? payload.get("email").asText().toLowerCase().trim() : null;
            if (email == null || email.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google token does not contain a valid email address");
            }

            String name = payload.hasNonNull("name") ? payload.get("name").asText() : email.split("@")[0];

            if (expectedClientId != null && !expectedClientId.isBlank()) {
                String aud = payload.hasNonNull("aud") ? payload.get("aud").asText() : "";
                if (!expectedClientId.equals(aud)) {
                    log.warn("Google token 'aud' ({}) does not match configured google.client.id ({})", aud, expectedClientId);
                }
            }

            // Find existing user or auto-register new Google user
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                log.info("Auto-registering new Google OAuth user: {}", email);
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setUsername(email);
                newUser.setName(name);
                newUser.setRole(User.Role.CUSTOMER);
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setPhoneVerified(true);
                User saved = userRepository.save(newUser);
                loyaltyService.initializeUserLoyalty(saved);
                loyaltyService.createReferralForNewUser(saved, null);

                if (emailService != null) {
                    try {
                        emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
                    } catch (Exception ignored) {}
                }

                return saved;
            });

            String token = authService.createTokenForUser(user.getId());
            UserDTO dto = new UserDTO();
            dto.setId(user.getId());
            dto.setEmail(user.getEmail());
            dto.setName(user.getName());
            dto.setRole(user.getRole() != null ? user.getRole().name() : "CUSTOMER");
            dto.setShopName(user.getShopName());
            dto.setReferralCode(user.getReferralCode());

            return new LoginResponse(token, dto);

        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception ex) {
            log.error("Failed to authenticate Google token: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Failed to verify Google token: " + ex.getMessage());
        }
    }
}
