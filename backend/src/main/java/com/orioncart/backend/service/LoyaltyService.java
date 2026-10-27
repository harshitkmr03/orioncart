package com.orioncart.backend.service;

import com.orioncart.backend.dto.LoyaltyBalanceDTO;
import com.orioncart.backend.dto.LoyaltyRedemptionPreviewRequest;
import com.orioncart.backend.dto.LoyaltyRedemptionPreviewResponse;
import com.orioncart.backend.dto.LoyaltyTransactionDTO;
import com.orioncart.backend.dto.ReferralHistoryDTO;
import com.orioncart.backend.dto.CartItemDTO;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.model.LoyaltyPoints;
import com.orioncart.backend.model.LoyaltyTransaction;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.Referral;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.LoyaltyPointsRepository;
import com.orioncart.backend.repository.LoyaltyTransactionRepository;
import com.orioncart.backend.repository.ReferralRepository;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LoyaltyService {
    private static final String TIER_BRONZE = "BRONZE";
    private static final String ORDER_EARN = "ORDER_EARN";
    private static final String REVIEW_EARN = "REVIEW_EARN";
    private static final String REDEMPTION = "REDEMPTION";
    private static final String REDEMPTION_REFUND = "REDEMPTION_REFUND";
    private static final String FIRST_ORDER_BONUS = "FIRST_ORDER_BONUS";
    private static final String REFERRAL_EARN = "REFERRAL_EARN";

    @Autowired
    private LoyaltyPointsRepository loyaltyPointsRepository;

    @Autowired
    private LoyaltyTransactionRepository loyaltyTransactionRepository;

    @Autowired
    private ReferralRepository referralRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CartService cartService;

    @Autowired
    private CouponService couponService;

    public void initializeUserLoyalty(User user) {
        if (user == null || user.getId() == null) {
            return;
        }

        loyaltyPointsRepository.findByUser_Id(user.getId()).orElseGet(() -> {
            LoyaltyPoints points = new LoyaltyPoints();
            points.setUser(user);
            points.setPointsBalance(0);
            points.setLifetimePoints(0);
            points.setTier(TIER_BRONZE);
            points.setUpdatedAt(LocalDateTime.now());
            return loyaltyPointsRepository.save(points);
        });
    }

    public void createReferralForNewUser(User referee, String referredByCode) {
        if (referee == null || referee.getId() == null || referredByCode == null || referredByCode.isBlank()) {
            return;
        }

        if (referralRepository.findByReferee_Id(referee.getId()).isPresent()) {
            return;
        }

        User referrer = userRepository.findByReferralCodeIgnoreCase(referredByCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Referral code is invalid"));

        if (Objects.equals(referrer.getId(), referee.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot use your own referral code");
        }

        if (referralRepository.countByReferrer_IdAndStatus(referrer.getId(), "REWARDED") >= 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Referral limit reached for this code");
        }

        Referral referral = new Referral();
        referral.setReferrer(referrer);
        referral.setReferee(referee);
        referral.setReferralCode(referrer.getReferralCode());
        referral.setStatus("PENDING");
        referral.setCreatedAt(LocalDateTime.now());
        referralRepository.save(referral);
    }

    public LoyaltyBalanceDTO getBalance(Long userId) {
        LoyaltyPoints points = getOrCreateBalance(userId);
        return new LoyaltyBalanceDTO(
                safeInt(points.getPointsBalance()),
                safeInt(points.getLifetimePoints()),
                points.getTier(),
                points.getUser() != null ? points.getUser().getReferralCode() : null
        );
    }

    public List<LoyaltyTransactionDTO> getTransactions(Long userId) {
        initializeUserLoyalty(findUser(userId));
        return loyaltyTransactionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(tx -> new LoyaltyTransactionDTO(
                        tx.getId(),
                        safeInt(tx.getPointsChange()),
                        tx.getTransactionType(),
                        tx.getReferenceId(),
                        tx.getDescription(),
                        tx.getCreatedAt()
                ))
                .toList();
    }

    public List<ReferralHistoryDTO> getReferralHistory(Long userId) {
        return referralRepository.findByReferrer_IdOrderByCreatedAtDesc(userId).stream()
                .map(referral -> new ReferralHistoryDTO(
                        referral.getId(),
                        referral.getReferee() != null ? referral.getReferee().getId() : null,
                        referral.getReferee() != null ? referral.getReferee().getName() : null,
                        referral.getReferralCode(),
                        referral.getStatus(),
                        referral.getCompletedAt(),
                        referral.getCreatedAt()
                ))
                .toList();
    }

    public double previewRedeemedDiscount(Long userId, Integer requestedPoints, double subtotal) {
        if (requestedPoints == null || requestedPoints <= 0) {
            return 0;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        double rate = getConversionRateForTier(balance.getTier());
        int validatedPoints = validateRedeemablePoints(
                requestedPoints, safeInt(balance.getPointsBalance()), subtotal, rate);
        return roundCurrency(validatedPoints * rate);
    }

    public LoyaltyRedemptionPreviewResponse previewRedemption(
            Long userId, LoyaltyRedemptionPreviewRequest request) {
        if (request == null || request.requestedPoints() == null || request.requestedPoints() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested points must be zero or greater");
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        CartResponse cart = cartService.getCart(userId);
        double subtotal = cart.getSubtotal();
        double couponDiscount = 0.0;
        String couponCode = request.couponCode();
        if (couponCode != null && !couponCode.isBlank()) {
            Set<Long> shopIds = cart.getItems().stream()
                    .map(CartItemDTO::getShopId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            couponDiscount = couponService.calculateDiscount(couponCode, subtotal, shopIds);
        }

        double netSubtotal = Math.max(0.0, subtotal - couponDiscount);
        int currentBalance = safeInt(balance.getPointsBalance());
        String tier = balance.getTier() == null ? TIER_BRONZE : balance.getTier();
        double rate = getConversionRateForTier(tier);
        int maxAllowed = calculateMaxRedeemablePoints(currentBalance, netSubtotal, rate);
        int requested = request.requestedPoints();

        if (requested == 0) {
            return new LoyaltyRedemptionPreviewResponse(
                    true, 0, 0, 0.0, currentBalance, maxAllowed,
                    roundCurrency(maxAllowed * rate), tier, rate, netSubtotal, "Choose points to redeem.");
        }
        if (currentBalance < 500) {
            return redemptionPreview(requested, currentBalance, maxAllowed, tier, rate, netSubtotal,
                    "A minimum balance of 500 points is required to redeem.");
        }
        if (requested < 500) {
            return redemptionPreview(requested, currentBalance, maxAllowed, tier, rate, netSubtotal,
                    "Minimum 500 points must be redeemed.");
        }
        if (requested % 100 != 0) {
            return redemptionPreview(requested, currentBalance, maxAllowed, tier, rate, netSubtotal,
                    "Points must be redeemed in increments of 100.");
        }
        if (requested > currentBalance) {
            return redemptionPreview(requested, currentBalance, maxAllowed, tier, rate, netSubtotal,
                    "Insufficient loyalty point balance.");
        }
        if (requested > maxAllowed) {
            return redemptionPreview(requested, currentBalance, maxAllowed, tier, rate, netSubtotal,
                    "Redemption exceeds the 20% net subtotal limit.");
        }

        return new LoyaltyRedemptionPreviewResponse(
                true, requested, requested, roundCurrency(requested * rate), currentBalance,
                maxAllowed, roundCurrency(maxAllowed * rate), tier, rate, netSubtotal,
                "Eligible for a Rs " + String.format(Locale.ROOT, "%.2f", requested * rate) + " discount.");
    }

    private LoyaltyRedemptionPreviewResponse redemptionPreview(
            int requested, int balance, int maxAllowed, String tier,
            double rate, double netSubtotal, String message) {
        return new LoyaltyRedemptionPreviewResponse(
                false, requested, 0, 0.0, balance, maxAllowed,
                roundCurrency(maxAllowed * rate), tier, rate, netSubtotal, message);
    }

    public void consumeRedeemedPoints(Long userId, Integer requestedPoints, Long orderId, double subtotal) {
        if (requestedPoints == null || requestedPoints <= 0) {
            return;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        double rate = getConversionRateForTier(balance.getTier());
        int validatedPoints = validateRedeemablePoints(
                requestedPoints, safeInt(balance.getPointsBalance()), subtotal, rate);
        if (validatedPoints <= 0) {
            return;
        }

        if (loyaltyTransactionRepository.existsByUser_IdAndTransactionTypeAndReferenceId(userId, REDEMPTION, orderId)) {
            return;
        }

        balance.setPointsBalance(safeInt(balance.getPointsBalance()) - validatedPoints);
        balance.setUpdatedAt(LocalDateTime.now());
        loyaltyPointsRepository.save(balance);

        createTransaction(balance.getUser(), -validatedPoints, REDEMPTION, orderId, "Redeemed on order #" + orderId);
    }

    public void refundRedeemedPoints(Long userId, Long orderId) {
        if (userId == null || orderId == null) {
            return;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        LoyaltyTransaction redemption = loyaltyTransactionRepository
                .findByUser_IdAndTransactionTypeAndReferenceId(userId, REDEMPTION, orderId)
                .orElse(null);
        if (redemption == null || redemption.getId() == null
                || loyaltyTransactionRepository.existsByReversedTxIdAndIsReversalTrue(redemption.getId())) {
            return;
        }

        Integer pointsChange = redemption.getPointsChange();
        if (pointsChange == null || pointsChange >= 0) {
            return;
        }
        int pointsToRestore = Math.toIntExact(Math.abs((long) pointsChange));
        if (pointsToRestore == 0) {
            return;
        }

        balance.setPointsBalance(Math.addExact(safeInt(balance.getPointsBalance()), pointsToRestore));
        balance.setUpdatedAt(LocalDateTime.now());
        loyaltyPointsRepository.save(balance);

        LoyaltyTransaction reversal = new LoyaltyTransaction();
        reversal.setUser(balance.getUser());
        reversal.setPointsChange(pointsToRestore);
        reversal.setTransactionType(REDEMPTION_REFUND);
        reversal.setReferenceId(orderId);
        reversal.setDescription("Reversal of loyalty points for cancelled order #" + orderId);
        reversal.setCreatedAt(LocalDateTime.now());
        reversal.setIsReversal(true);
        reversal.setReversedTxId(redemption.getId());
        loyaltyTransactionRepository.save(reversal);
    }

    public void awardForCompletedOrder(Order order) {
        if (order == null || order.getId() == null || order.getCustomer() == null || order.getCustomer().getId() == null) {
            return;
        }

        Long userId = order.getCustomer().getId();
        if (loyaltyTransactionRepository.existsByUser_IdAndTransactionTypeAndReferenceId(userId, ORDER_EARN, order.getId())) {
            return;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        int earnedPoints = (int) Math.floor(Math.max(0.0, order.getTotalAmount()) / 100.0) * 10;
        if (earnedPoints > 0) {
            addPoints(balance, earnedPoints, ORDER_EARN, order.getId(), "Order reward for order #" + order.getId());
        }

        if (!loyaltyTransactionRepository.existsByUser_IdAndTransactionType(userId, FIRST_ORDER_BONUS)) {
            addPoints(balance, 100, FIRST_ORDER_BONUS, order.getId(), "First order bonus");
        }

        rewardReferralIfEligible(balance.getUser(), order.getId());
    }

    public void awardForReview(Long userId, Long reviewId) {
        if (userId == null || reviewId == null) {
            return;
        }
        if (loyaltyTransactionRepository.existsByUser_IdAndTransactionTypeAndReferenceId(userId, REVIEW_EARN, reviewId)) {
            return;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        addPoints(balance, 20, REVIEW_EARN, reviewId, "Verified review reward");
    }

    private void rewardReferralIfEligible(User referee, Long orderId) {
        referralRepository.findByReferee_Id(referee.getId()).ifPresent(referral -> {
            if ("REWARDED".equalsIgnoreCase(referral.getStatus())) {
                return;
            }

            LoyaltyPoints refereeBalance = getOrCreateBalance(referee.getId());
            addPoints(refereeBalance, 100, REFERRAL_EARN, referral.getId(), "Referral bonus on first completed order");

            if (referral.getReferrer() != null && referral.getReferrer().getId() != null) {
                LoyaltyPoints referrerBalance = getOrCreateBalance(referral.getReferrer().getId());
                addPoints(referrerBalance, 200, REFERRAL_EARN, referral.getId(), "Referral reward for invited customer");
            }

            referral.setStatus("REWARDED");
            referral.setCompletedAt(LocalDateTime.now());
            referralRepository.save(referral);
        });
    }

    private LoyaltyPoints getOrCreateBalance(Long userId) {
        return loyaltyPointsRepository.findByUserIdForUpdate(userId).orElseGet(() -> {
            User user = findUser(userId);
            LoyaltyPoints points = new LoyaltyPoints();
            points.setUser(user);
            points.setPointsBalance(0);
            points.setLifetimePoints(0);
            points.setTier(TIER_BRONZE);
            points.setUpdatedAt(LocalDateTime.now());
            return loyaltyPointsRepository.save(points);
        });
    }

    private void addPoints(LoyaltyPoints balance, int delta, String transactionType, Long referenceId, String description) {
        balance.setPointsBalance(safeInt(balance.getPointsBalance()) + delta);
        balance.setLifetimePoints(Math.max(safeInt(balance.getLifetimePoints()), 0) + Math.max(delta, 0));
        balance.setTier(resolveTier(safeInt(balance.getLifetimePoints())));
        balance.setUpdatedAt(LocalDateTime.now());
        loyaltyPointsRepository.save(balance);
        createTransaction(balance.getUser(), delta, transactionType, referenceId, description);
    }

    private void createTransaction(User user, int delta, String transactionType, Long referenceId, String description) {
        LoyaltyTransaction tx = new LoyaltyTransaction();
        tx.setUser(user);
        tx.setPointsChange(delta);
        tx.setTransactionType(transactionType);
        tx.setReferenceId(referenceId);
        tx.setDescription(description);
        tx.setCreatedAt(LocalDateTime.now());
        tx.setIsReversal(false);
        loyaltyTransactionRepository.save(tx);
    }

    private int validateRedeemablePoints(int requestedPoints, int balance, double subtotal, double rate) {
        if (requestedPoints < 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum 500 points required for redemption");
        }
        if (requestedPoints % 100 != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Points must be redeemed in increments of 100");
        }
        if (requestedPoints > balance) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You do not have enough points");
        }

        int cap = calculateMaxRedeemablePoints(balance, subtotal, rate);
        if (cap <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order subtotal is too low for redemption");
        }
        if (requestedPoints > cap) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Points redemption exceeds the 20% order cap");
        }

        return requestedPoints;
    }

    private int calculateMaxRedeemablePoints(int balance, double netSubtotal, double rate) {
        if (balance <= 0 || !Double.isFinite(netSubtotal) || netSubtotal <= 0 || rate <= 0) {
            return 0;
        }
        double pointsInHundreds = Math.floor((netSubtotal * 0.20) / rate / 100.0);
        long cap = (long) Math.min(Integer.MAX_VALUE, pointsInHundreds * 100.0);
        int byCap = (int) Math.max(0, cap);
        return Math.min(balance, byCap / 100 * 100);
    }

    public double getConversionRateForTier(String tier) {
        String normalized = tier == null ? TIER_BRONZE : tier.trim().toUpperCase(Locale.ROOT);
        return "GOLD".equals(normalized) || "PLATINUM".equals(normalized) ? 0.012 : 0.010;
    }

    private String resolveTier(int lifetimePoints) {
        if (lifetimePoints >= 15000) {
            return "PLATINUM";
        }
        if (lifetimePoints >= 5000) {
            return "GOLD";
        }
        if (lifetimePoints >= 1000) {
            return "SILVER";
        }
        return TIER_BRONZE;
    }



    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
