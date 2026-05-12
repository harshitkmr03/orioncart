package com.localconnect.service;

import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ScheduledFuture;

@Service
public class PaymentProviderStub {

    private final PaymentService paymentService;
    private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

    public PaymentProviderStub(PaymentService paymentService) {
        this.paymentService = paymentService;
        this.scheduler.initialize();
    }

    /**
     * Simulate provider sending a webhook callback after `delayMs` milliseconds.
     * If `success` is true, status=COMPLETED else status=FAILED.
     */
    public ScheduledFuture<?> simulateCallback(Long paymentId, boolean success, long delayMs) {
        Runnable task = () -> {
            String status = success ? "COMPLETED" : "FAILED";
            // directly invoke payment service webhook handler using configured secret
            paymentService.handleWebhook(paymentId, status, null, null);
        };
        return scheduler.schedule(task, Instant.now().plusMillis(delayMs));
    }
}
