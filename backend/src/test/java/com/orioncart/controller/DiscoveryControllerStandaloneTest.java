package com.orioncart.controller;

import com.orioncart.service.DiscoveryService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DiscoveryControllerStandaloneTest {

    @Test
    void getDiscovery_returnsOk() throws Exception {
        DiscoveryService mockService = Mockito.mock(DiscoveryService.class);
        when(mockService.findNearby(anyDouble(), anyDouble(), anyInt()))
                .thenReturn(Collections.emptyList());

        DiscoveryController controller = new DiscoveryController(mockService);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        mvc.perform(get("/api/discovery").param("lat", "12.0").param("lng","77.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}

