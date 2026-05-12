package com.localconnect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localconnect.dto.OrderItemDto;
import com.localconnect.dto.OrderRequest;
import com.localconnect.service.OrderService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class OrderControllerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void placeOrder_success() throws Exception {
        OrderService svc = Mockito.mock(OrderService.class);
        OrderController controller = new OrderController(svc);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        OrderItemDto item = new OrderItemDto(); item.setProductId(1L); item.setQuantity(2);
        OrderRequest req = new OrderRequest(); req.setItems(List.of(item));

        mvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void placeOrder_conflictOnInsufficient() throws Exception {
        OrderService svc = Mockito.mock(OrderService.class);
        doThrow(new IllegalStateException("Insufficient")).when(svc).reserveMultiple(Mockito.any());
        OrderController controller = new OrderController(svc);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        OrderItemDto item = new OrderItemDto(); item.setProductId(1L); item.setQuantity(1000);
        OrderRequest req = new OrderRequest(); req.setItems(List.of(item));

        mvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }
}
