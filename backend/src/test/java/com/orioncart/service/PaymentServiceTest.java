package com.orioncart.service;

import com.orioncart.domain.Payment;
import com.orioncart.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        // set webhook secret for signature validation
        ReflectionTestUtils.setField(paymentService, "webhookSecret", "test-secret");
    }

    @Test
    void createPaymentIntent_savesPendingPayment() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment p = paymentService.createPaymentIntent(42L, 1500L, "INR");

        assertNotNull(p);
        assertEquals(42L, p.getOrderId());
        assertEquals(1500L, p.getAmountCents());
        assertEquals("PENDING", p.getStatus());
        assertNotNull(p.getProviderPaymentId());
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void handleWebhook_updatesStatus_whenSignatureMatches() {
        Payment stored = new Payment();
        stored.setId(7L);
        stored.setStatus("PENDING");
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(stored));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = paymentService.handleWebhook(7L, "COMPLETED", "test-secret", null);

        assertTrue(result.isPresent());
        assertEquals("COMPLETED", result.get().getStatus());
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void handleWebhook_rejects_whenSignatureMismatch() {
        Payment stored = new Payment();
        stored.setId(8L);
        stored.setStatus("PENDING");
        when(paymentRepository.findById(8L)).thenReturn(Optional.of(stored));

        var result = paymentService.handleWebhook(8L, "COMPLETED", "bad-signature", null);

        assertTrue(result.isEmpty());
        verify(paymentRepository, never()).save(any());
    }
}

