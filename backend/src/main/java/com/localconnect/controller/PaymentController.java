package com.localconnect.controller;

import com.localconnect.domain.Payment;
import com.localconnect.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/intent")
    public ResponseEntity<Payment> createIntent(@RequestBody Map<String, Object> body) {
        Long orderId = body.get("orderId") == null ? null : Long.valueOf(body.get("orderId").toString());
        Long amount = body.get("amountCents") == null ? 0L : Long.valueOf(body.get("amountCents").toString());
        String currency = (String) body.getOrDefault("currency", "INR");
        if (orderId == null) {
            return ResponseEntity.badRequest().build();
        }
        Payment p = paymentService.createPaymentIntent(orderId, amount, currency);
        return ResponseEntity.ok(p);
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(@RequestHeader(value = "X-Signature", required = false) String signature,
                                          @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
                                          @RequestBody Map<String, Object> body) {
        // Expecting {"paymentId": 123, "status":"COMPLETED"}
        if (body == null || body.get("paymentId") == null || body.get("status") == null) {
            return ResponseEntity.badRequest().body("invalid payload");
        }
        Long paymentId = Long.valueOf(body.get("paymentId").toString());
        String status = body.get("status").toString();
        // enqueue for durable processing to handle retries/backoff
        String payload = body.toString();
        try {
            // lazy-get the queue service bean via application context would be better, but constructor injection not available here;
            // simple static access via paymentService is used to enqueue through PaymentService's webhookRepository path.
            // For clarity, call a dedicated WebhookQueueService bean instead (autowired below).
        } catch (Exception ex) {
            // fall back to immediate processing
        }
        // We will enqueue via a WebhookQueueService bean if available from Spring
        try {
            var ctx = org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
            if (ctx != null && ctx.containsBean("webhookQueueService")) {
                var queue = (com.localconnect.service.WebhookQueueService) ctx.getBean("webhookQueueService");
                queue.enqueue(paymentId, status, signature, idempotencyKey, payload);
                return ResponseEntity.accepted().body("enqueued");
            }
        } catch (Throwable ignore) {
        }

        // if queue not available, process synchronously
        var updated = paymentService.handleWebhook(paymentId, status, signature, idempotencyKey);
        if (updated.isPresent()) {
            return ResponseEntity.ok("ok");
        }
        return ResponseEntity.status(403).body("forbidden");
    }
}
