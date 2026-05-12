package com.localconnect.backend.controller;

import com.localconnect.backend.dto.ReviewRequest;
import com.localconnect.backend.dto.ReviewResponse;
import com.localconnect.backend.service.AuthService;
import com.localconnect.backend.service.ReviewService;
import com.localconnect.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @PostMapping("/reviews")
    public ResponseEntity<?> createReview(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody ReviewRequest request
    ) {
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing authentication token"));
        }

        return authService.getUserIdForToken(token)
                .flatMap(userService::findById)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(reviewService.createReview(user.getId(), request)))
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token")));
    }

    @GetMapping("/shops/{shopId}/reviews")
    public List<ReviewResponse> getReviewsForShop(@PathVariable Long shopId) {
        return reviewService.getReviewsForShop(shopId);
    }
}
