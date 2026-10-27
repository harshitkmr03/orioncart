package com.orioncart.backend.service;

import com.orioncart.backend.dto.CartItemDTO;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.dto.LoyaltyRedemptionPreviewRequest;
import com.orioncart.backend.dto.LoyaltyRedemptionPreviewResponse;
import com.orioncart.backend.model.LoyaltyPoints;
import com.orioncart.backend.model.LoyaltyTransaction;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.LoyaltyPointsRepository;
import com.orioncart.backend.repository.LoyaltyTransactionRepository;
import com.orioncart.backend.repository.ReferralRepository;
import com.orioncart.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceTest {
    private static final Long USER_ID = 7L;
    private static final Long ORDER_ID = 21L;

    @Mock private LoyaltyPointsRepository loyaltyPointsRepository;
    @Mock private LoyaltyTransactionRepository loyaltyTransactionRepository;
    @Mock private ReferralRepository referralRepository;
    @Mock private UserRepository userRepository;
    @Mock private CartService cartService;
    @Mock private CouponService couponService;

    @InjectMocks private LoyaltyService loyaltyService;

    @Test
    void previewUsesServerCartCouponAndTierConversion() {
        LoyaltyPoints balance = points(20000, "GOLD");
        when(loyaltyPointsRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(balance));
        when(cartService.getCart(USER_ID)).thenReturn(cart(1000.0, 14L));
        when(couponService.calculateDiscount("SAVE", 1000.0, Set.of(14L))).thenReturn(100.0);

        LoyaltyRedemptionPreviewResponse response = loyaltyService.previewRedemption(
                USER_ID, new LoyaltyRedemptionPreviewRequest(10000, "SAVE"));

        assertTrue(response.eligible());
        assertEquals(120.0, response.discountAmount());
        assertEquals(15000, response.maxRedeemablePoints());
        assertEquals(900.0, response.netSubtotal());
        assertEquals(0.012, response.conversionRate());
    }

    @Test
    void previewRejectsBelowMinimumAndNonHundredPointRequests() {
        when(loyaltyPointsRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(points(5000, "BRONZE")));
        when(cartService.getCart(USER_ID)).thenReturn(cart(1000.0, 14L));

        LoyaltyRedemptionPreviewResponse belowMinimum = loyaltyService.previewRedemption(
                USER_ID, new LoyaltyRedemptionPreviewRequest(400, null));
        LoyaltyRedemptionPreviewResponse invalidStep = loyaltyService.previewRedemption(
                USER_ID, new LoyaltyRedemptionPreviewRequest(550, null));

        assertFalse(belowMinimum.eligible());
        assertTrue(belowMinimum.message().contains("500"));
        assertFalse(invalidStep.eligible());
        assertTrue(invalidStep.message().contains("increments of 100"));
        verify(couponService, never()).calculateDiscount(any(), any(Double.class), anyCollection());
    }

    @Test
    void consumesPointsUsingTierRateAndRecordsRedemption() {
        LoyaltyPoints balance = points(5000, "GOLD");
        when(loyaltyPointsRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(balance));
        when(loyaltyTransactionRepository.existsByUser_IdAndTransactionTypeAndReferenceId(
                USER_ID, "REDEMPTION", ORDER_ID)).thenReturn(false);

        loyaltyService.consumeRedeemedPoints(USER_ID, 1500, ORDER_ID, 1000.0);

        assertEquals(3500, balance.getPointsBalance());
        verify(loyaltyPointsRepository).save(balance);
        verify(loyaltyTransactionRepository).save(any(LoyaltyTransaction.class));
    }

    @Test
    void cancellationRefundRestoresPointsOnlyOnce() {
        LoyaltyPoints balance = points(3500, "GOLD");
        LoyaltyTransaction redemption = new LoyaltyTransaction();
        redemption.setId(44L);
        redemption.setPointsChange(-1500);
        when(loyaltyPointsRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(balance));
        when(loyaltyTransactionRepository.findByUser_IdAndTransactionTypeAndReferenceId(
                USER_ID, "REDEMPTION", ORDER_ID)).thenReturn(Optional.of(redemption));
        when(loyaltyTransactionRepository.existsByReversedTxIdAndIsReversalTrue(44L))
                .thenReturn(false, true);

        loyaltyService.refundRedeemedPoints(USER_ID, ORDER_ID);
        loyaltyService.refundRedeemedPoints(USER_ID, ORDER_ID);

        assertEquals(5000, balance.getPointsBalance());
        verify(loyaltyPointsRepository).save(balance);
        verify(loyaltyTransactionRepository).save(any(LoyaltyTransaction.class));
    }

    private LoyaltyPoints points(int balance, String tier) {
        User user = new User();
        user.setId(USER_ID);
        LoyaltyPoints points = new LoyaltyPoints();
        points.setUser(user);
        points.setPointsBalance(balance);
        points.setTier(tier);
        return points;
    }

    private CartResponse cart(double subtotal, Long shopId) {
        CartItemDTO item = new CartItemDTO();
        item.setShopId(shopId);
        CartResponse cart = new CartResponse();
        cart.setSubtotal(subtotal);
        cart.setItems(List.of(item));
        return cart;
    }
}
