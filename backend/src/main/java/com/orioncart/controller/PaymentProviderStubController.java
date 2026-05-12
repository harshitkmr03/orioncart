package com.orioncart.controller;

import com.orioncart.service.PaymentProviderStub;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/stub")
public class PaymentProviderStubController {

    private final PaymentProviderStub stub;

    public PaymentProviderStubController(PaymentProviderStub stub) {
        this.stub = stub;
    }

    @PostMapping("/{paymentId}")
    public ResponseEntity<String> trigger(@PathVariable Long paymentId,
                                          @RequestParam(defaultValue = "true") boolean success,
                                          @RequestParam(defaultValue = "1000") long delayMs) {
        stub.simulateCallback(paymentId, success, delayMs);
        return ResponseEntity.accepted().body("scheduled");
    }
}

