package com.orioncart.service;

import com.orioncart.domain.Payment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.concurrent.ScheduledFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentProviderStubTest {

    @Mock
    private PaymentService paymentService;

    private PaymentProviderStub stub;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        stub = new PaymentProviderStub(paymentService);
    }

    @Test
    void simulateCallback_invokesPaymentService() throws Exception {
        // schedule with zero delay for deterministic execution
        ScheduledFuture<?> f = stub.simulateCallback(11L, true, 0L);
        // wait briefly for the scheduler to run
        f.get();
        ArgumentCaptor<Long> idCap = ArgumentCaptor.forClass(Long.class);
        verify(paymentService, times(1)).handleWebhook(idCap.capture(), eq("COMPLETED"), isNull(), isNull());
        assertEquals(11L, idCap.getValue());
    }
}

