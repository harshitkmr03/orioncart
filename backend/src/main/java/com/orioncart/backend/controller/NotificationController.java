package com.orioncart.backend.controller;

import com.orioncart.backend.service.AuthService;
import com.orioncart.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private AuthService authService;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getNotifications(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(Map.of(
                        "items", notificationService.getNotifications(userId),
                        "unreadCount", notificationService.getUnreadCount(userId)
                )))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> ResponseEntity.ok(notificationService.markAsRead(userId, id)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .<ResponseEntity<?>>map(userId -> {
                    notificationService.markAllAsRead(userId);
                    return ResponseEntity.ok(Map.of("message", "Notifications marked as read"));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }
}

