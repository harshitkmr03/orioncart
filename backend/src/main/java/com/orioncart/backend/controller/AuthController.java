package com.orioncart.backend.controller;

import com.orioncart.backend.model.User;
import com.orioncart.backend.service.UserService;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.dto.UserDTO;
import com.orioncart.backend.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Allow frontend to access
public class AuthController {
    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            User saved = userService.registerUser(user);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", ex.getMessage()));
        } catch (Exception ex) {
            // log exception to console for now
            ex.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Collections.singletonMap("message", ex.getMessage() == null ? "Server error" : ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody User loginRequest) {
        Optional<User> user = userService.login(loginRequest.getUsername(), loginRequest.getPassword());
        if (user.isPresent()) {
            User u = user.get();
            String token = authService.createTokenForUser(u.getId());
            UserDTO dto = new UserDTO();
            dto.setId(u.getId());
            dto.setUsername(u.getUsername());
            dto.setName(u.getName());
            dto.setRole(u.getRole() != null ? u.getRole().name() : null);
            dto.setShopName(u.getShopName());
            dto.setReferralCode(u.getReferralCode());
            dto.setLoyaltyTier(u.getLoyaltyTier());
            LoginResponse resp = new LoginResponse(token, dto);
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.status(401).build();
    }

    @PutMapping("/become-seller/{id}")
    public ResponseEntity<User> becomeSeller(@PathVariable("id") Long id) {
        Optional<User> updated = userService.becomeSeller(id);
        return updated.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

