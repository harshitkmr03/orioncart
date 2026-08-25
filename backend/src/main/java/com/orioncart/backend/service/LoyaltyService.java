package com.orioncart.backend.service;

import com.orioncart.backend.dto.LoyaltyBalanceDTO;
import com.orioncart.backend.dto.LoyaltyTransactionDTO;
import com.orioncart.backend.dto.ReferralHistoryDTO;
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

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LoyaltyService {
    private static final String TIER_BRONZE = "BRONZE";
    private static final String ORDER_EARN = "ORDER_EARN";
    private static final String REVIEW_EARN = "REVIEW_EARN";
    private static final String REDEMPTION = "REDEMPTION";
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
        int validatedPoints = validateRedeemablePoints(requestedPoints, safeInt(balance.getPointsBalance()), subtotal);
        return roundCurrency(validatedPoints / 100.0);
    }

    public void consumeRedeemedPoints(Long userId, Integer requestedPoints, Long orderId, double subtotal) {
        if (requestedPoints == null || requestedPoints <= 0) {
            return;
        }

        LoyaltyPoints balance = getOrCreateBalance(userId);
        int validatedPoints = validateRedeemablePoints(requestedPoints, safeInt(balance.getPointsBalance()), subtotal);
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
        loyaltyTransactionRepository.save(tx);
    }

    private int validateRedeemablePoints(int requestedPoints, int balance, double subtotal) {
        if (requestedPoints < 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum 500 points required for redemption");
        }
        if (requestedPoints > balance) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You do not have enough points");
        }

        int cap = (int) Math.floor(Math.max(0, subtotal) * 0.20 * 100);
        if (cap <= 0) {
            return 0;
        }
        if (requestedPoints > cap) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Points redemption exceeds the 20% order cap");
        }

        return requestedPoints;
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

