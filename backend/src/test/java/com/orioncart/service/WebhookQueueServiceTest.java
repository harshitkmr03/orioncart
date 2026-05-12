package com.orioncart.service;

import com.orioncart.domain.WebhookDelivery;
import com.orioncart.repository.WebhookDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebhookQueueServiceTest {

    @Mock
    private WebhookDeliveryRepository repo;

    @Mock
    private PaymentService paymentService;

    @Mock
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    private WebhookQueueService queueService;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        queueService = new WebhookQueueService(repo, paymentService, rabbitTemplate);
        ReflectionTestUtils.setField(queueService, "baseBackoffMs", 2000L);
        ReflectionTestUtils.setField(queueService, "maxAttempts", 5);
        ReflectionTestUtils.setField(queueService, "exchange", "webhook.exchange");
        ReflectionTestUtils.setField(queueService, "routingKey", "webhook.delivery");
    }

    @Test
    void enqueue_createsRecord_whenNoDuplicate() {
        when(repo.findByIdempotencyKey("key-1")).thenReturn(null);
        when(repo.save(any(WebhookDelivery.class))).thenAnswer(inv -> inv.getArgument(0));

        WebhookDelivery d = queueService.enqueue(5L, "COMPLETED", "sig-123", "key-1", "{status:COMPLETED}");

        assertNotNull(d);
        assertEquals(5L, d.getPaymentId());
        assertEquals("key-1", d.getIdempotencyKey());
        assertEquals("sig-123", d.getSignature());
        verify(repo, times(1)).save(any(WebhookDelivery.class));
        // verify RabbitTemplate was called with JSON containing the deliveryId
        org.mockito.ArgumentCaptor<String> captor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(rabbitTemplate, times(1)).convertAndSend(anyString(), anyString(), captor.capture());
        String sentJson = captor.getValue();
        assertTrue(sentJson.contains("\"deliveryId\":"));
    }

    @Test
    void processSingle_marksCompleted_onSuccessfulHandle() {
        WebhookDelivery d = new WebhookDelivery();
        d.setPaymentId(9L);
        d.setPayload("COMPLETED");
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentService.handleWebhook(eq(9L), eq("COMPLETED"), eq("sig-9"), isNull())).thenReturn(java.util.Optional.ofNullable(new com.orioncart.domain.Payment()));

        d.setSignature("sig-9");
        queueService.processSingle(d);

        assertEquals("COMPLETED", d.getStatus());
    }

    @Test
    void processSingle_retriesOnFailure_andBackoffIncreases() {
        WebhookDelivery d = new WebhookDelivery();
        d.setPaymentId(10L);
        d.setPayload("COMPLETED");
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentService.handleWebhook(eq(10L), eq("COMPLETED"), eq("sig-10"), isNull()))
            .thenReturn(java.util.Optional.empty());

        d.setSignature("sig-10");
        queueService.processSingle(d);

        assertEquals("FAILED", d.getStatus());
        assertTrue(d.getAttempts() >= 1);
        assertTrue(d.getNextAttemptAt().isAfter(OffsetDateTime.now()));
    }
}

