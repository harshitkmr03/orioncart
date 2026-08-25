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
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Collections.singletonMap("message", ex.getMessage() == null ? "Server error" : ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody User loginRequest) {
        Optional<User> user = userService.login(loginRequest.getEmail(), loginRequest.getPassword());
        if (user.isPresent()) {
            User u = user.get();
            String token = authService.createTokenForUser(u.getId());
            UserDTO dto = new UserDTO();
            dto.setId(u.getId());
            dto.setEmail(u.getEmail());
            dto.setName(u.getName());
            dto.setRole(u.getRole() != null ? u.getRole().name() : null);
            dto.setShopName(u.getShopName());
            dto.setReferralCode(u.getReferralCode());
            LoginResponse resp = new LoginResponse(token, dto);
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.status(401).build();
    }

    @PutMapping("/become-seller/{id}")
    public ResponseEntity<?> becomeSeller(@PathVariable("id") Long id,
                                          @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(java.util.Collections.singletonMap("message", "Missing authentication token"));
        }
        Optional<Long> callerIdOpt = authService.getUserIdForToken(token);
        if (callerIdOpt.isEmpty() || !callerIdOpt.get().equals(id)) {
            return ResponseEntity.status(403).body(java.util.Collections.singletonMap("message", "Forbidden: token does not match target user"));
        }

        Optional<User> updated = userService.becomeSeller(id);
        return updated.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

