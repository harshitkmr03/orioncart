package com.orioncart.controller;

import com.orioncart.dto.ShopDistance;
import com.orioncart.service.DiscoveryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DiscoveryControllerTest {

    private final DiscoveryService discoveryService = Mockito.mock(DiscoveryService.class);

    private final MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new DiscoveryController(discoveryService))
            .build();

    private static class ShopDistanceImpl implements ShopDistance {
        private final Long id;
        private final String name;
        private final Double distance;

        private ShopDistanceImpl(Long id, String name, Double distance) {
            this.id = id; this.name = name; this.distance = distance;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public Double getDistance() { return distance; }
    }

    @Test
    @DisplayName("GET /api/discovery/dto returns projection JSON")
    public void returnsProjection() throws Exception {
        given(discoveryService.findNearbyProjection(anyDouble(), anyDouble(), anyDouble()))
                .willReturn(List.of(new ShopDistanceImpl(1L, "Demo Shop A", 123.4)));

        mvc.perform(get("/api/discovery/dto").param("lat", "12.97").param("lng", "77.59").param("radiusMeters", "5000"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Demo Shop A")));
    }
}

