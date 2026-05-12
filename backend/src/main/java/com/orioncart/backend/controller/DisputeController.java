package com.orioncart.backend.controller;

import com.orioncart.backend.dto.DisputeRequest;
import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.DisputeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/disputes")
@CrossOrigin(origins = "*")
public class DisputeController {

    @Autowired
    private DisputeService disputeService;

    @Autowired
    private AuthService authService;

    @PostMapping
    public ResponseEntity<?> createDispute(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody DisputeRequest request
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(disputeService.createDispute(userId, request)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping
    public ResponseEntity<?> getMyDisputes(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestParam(required = false) Long orderId
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(disputeService.getCustomerDisputes(userId, orderId)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }
}

