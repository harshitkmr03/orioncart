package com.orioncart.backend.service;

import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LoyaltyService loyaltyService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public User registerUser(User user) {
        // Validate required fields
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Email (username) is required");
        }
        // Check duplicate username/email
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("An account with that email already exists");
        }
        // Ensure a role is set; default to CUSTOMER if not provided
        if (user.getRole() == null) {
            try {
                user.setRole(User.Role.CUSTOMER);
            } catch (Exception ignored) {}
        }
        if (user.getPhoneVerified() == null) {
            user.setPhoneVerified(false);
        }
        user.setLoyaltyTier("BRONZE");
        user.setReferralCode(generateReferralCode(user.getName()));
        // Hash password before saving
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            String hashed = passwordEncoder.encode(user.getPassword());
            user.setPassword(hashed);
        }
        User saved = userRepository.save(user);
        loyaltyService.initializeUserLoyalty(saved);
        loyaltyService.createReferralForNewUser(saved, user.getReferredByCode());
        return saved;
    }

    public Optional<User> login(String username, String password) {
        // In a real app, use BCrypt and JWT. For this demo, simple plain text check.
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isPresent()) {
            String storedHash = user.get().getPassword();
            if (storedHash != null && passwordEncoder.matches(password, storedHash)) {
                return user;
            }
        }
        return Optional.empty();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> becomeSeller(Long userId) {
        Optional<User> maybe = userRepository.findById(userId);
        if (maybe.isPresent()) {
            User user = maybe.get();
            user.setRole(User.Role.SHOPKEEPER);
            userRepository.save(user);
            return Optional.of(user);
        }
        return Optional.empty();
    }

    private String generateReferralCode(String name) {
        String base = (name == null || name.isBlank() ? "LOCAL" : name.replaceAll("[^A-Za-z]", "").toUpperCase());
        if (base.isBlank()) {
            base = "LOCAL";
        }
        base = base.length() > 5 ? base.substring(0, 5) : base;

        String candidate;
        do {
            int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
            candidate = "LC-" + base + suffix;
        } while (userRepository.findByReferralCodeIgnoreCase(candidate).isPresent());

        return candidate;
    }
}

