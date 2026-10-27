package com.orioncart.backend.service;

import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private final SecureRandom secureRandom = new SecureRandom();
    private final ConcurrentHashMap<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public static class OtpEntry {
        private final String otp;
        private final Instant expiresAt;

        public OtpEntry(String otp, Instant expiresAt) {
            this.otp = otp;
            this.expiresAt = expiresAt;
        }

        public String getOtp() {
            return otp;
        }

        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    public Map<String, Object> sendResetOtp(String email) {
        String normalized = normalizeEmail(email);
        String recipientName = userRepository.findByEmail(normalized)
                .map(User::getName)
                .orElse("OrionCart User");

        String otp = generateNumericOtp();
        Instant expiresAt = Instant.now().plus(OTP_EXPIRY_MINUTES, ChronoUnit.MINUTES);
        otpStore.put(normalized, new OtpEntry(otp, expiresAt));

        boolean emailDispatched = emailService.sendPasswordResetOtp(normalized, otp, recipientName);

        return Map.of(
                "message", "Verification OTP sent to " + email,
                "email", normalized,
                "expiresInMinutes", OTP_EXPIRY_MINUTES,
                "emailDispatched", emailDispatched
        );
    }

    public Map<String, Object> verifyOtp(String email, String otp) {
        validateOtpEntry(email, otp);
        return Map.of(
                "valid", true,
                "message", "OTP verified successfully"
        );
    }

    public Map<String, Object> resetPassword(String email, String otp, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        String normalized = normalizeEmail(email);
        validateOtpEntry(normalized, otp);

        User user = userRepository.findByEmail(normalized).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(normalized);
            newUser.setUsername(normalized);
            newUser.setName(normalized.split("@")[0]);
            newUser.setRole(User.Role.CUSTOMER);
            newUser.setPhoneVerified(true);
            return newUser;
        });

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate OTP immediately to prevent replay
        otpStore.remove(normalized);

        return Map.of(
                "message", "Password reset successfully. You can now login with your new password.",
                "email", normalized
        );
    }

    public Optional<String> getOtpForTesting(String email) {
        String normalized = normalizeEmail(email);
        OtpEntry entry = otpStore.get(normalized);
        if (entry != null && !entry.isExpired()) {
            return Optional.of(entry.getOtp());
        }
        return Optional.empty();
    }

    private void validateOtpEntry(String email, String otp) {
        String normalized = normalizeEmail(email);
        OtpEntry entry = otpStore.get(normalized);

        if (entry == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No OTP request found for this email. Please request a new code.");
        }

        if (entry.isExpired()) {
            otpStore.remove(normalized);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired. Please request a new code.");
        }

        if (!entry.getOtp().equals(otp != null ? otp.trim() : "")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code");
        }
    }

    private String generateNumericOtp() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
