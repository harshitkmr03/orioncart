package com.orioncart.backend.service;

import com.orioncart.backend.dto.ReviewRequest;
import com.orioncart.backend.dto.ReviewResponse;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.Review;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ReviewRepository;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LoyaltyService loyaltyService;

    public ReviewResponse createReview(Long buyerId, ReviewRequest request) {
        if (request == null || request.getShopId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop id is required");
        }
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }

        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));

        Product product = null;
        if (request.getProductId() != null) {
            product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            if (product.getShop() == null || !shop.getId().equals(product.getShop().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product does not belong to the selected shop");
            }
        }

        if (request.getOrderId() != null && reviewRepository.existsByShop_IdAndBuyer_IdAndOrderId(shop.getId(), buyerId, request.getOrderId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Review already submitted for this order");
        }

        Review review = new Review();
        review.setShop(shop);
        review.setProduct(product);
        review.setBuyer(buyer);
        review.setOrderId(request.getOrderId());
        review.setRating(request.getRating());
        review.setComment(request.getComment() == null ? null : request.getComment().trim());
        review.setCreatedAt(LocalDateTime.now());

        Review saved = reviewRepository.save(review);
        loyaltyService.awardForReview(buyerId, saved.getId());
        return toResponse(saved);
    }

    public List<ReviewResponse> getReviewsForShop(Long shopId) {
        return reviewRepository.findByShop_IdOrderByCreatedAtDesc(shopId).stream()
                .map(this::toResponse)
                .toList();
    }

    public Map<Long, ShopReviewSnapshot> getShopReviewSnapshots(List<Long> shopIds) {
        if (shopIds == null || shopIds.isEmpty()) {
            return Map.of();
        }

        return reviewRepository.summarizeByShopIds(shopIds).stream()
                .collect(Collectors.toMap(
                        ReviewRepository.ShopReviewStats::getShopId,
                        stats -> new ShopReviewSnapshot(
                                roundToSingleDecimal(stats.getAverageRating()),
                                stats.getReviewCount() == null ? 0L : stats.getReviewCount()
                        )
                ));
    }

    public ShopReviewSnapshot getShopReviewSnapshot(Long shopId) {
        Double avg = reviewRepository.averageRatingForShop(shopId);
        long count = reviewRepository.countByShop_Id(shopId);
        return new ShopReviewSnapshot(roundToSingleDecimal(avg), count);
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getShop() != null ? review.getShop().getId() : null,
                review.getProduct() != null ? review.getProduct().getId() : null,
                review.getOrderId(),
                review.getBuyer() != null ? review.getBuyer().getId() : null,
                review.getBuyer() != null ? review.getBuyer().getName() : null,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    private double roundToSingleDecimal(Double value) {
        double safeValue = value == null ? 0.0 : value;
        return Math.round(safeValue * 10.0) / 10.0;
    }

    public record ShopReviewSnapshot(double averageRating, long reviewCount) {
    }
}

