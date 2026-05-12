package com.orioncart.service;

import com.orioncart.repository.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;

public class DiscoveryServiceTest {

    private ShopRepository shopRepository;
    private DiscoveryService discoveryService;

    @BeforeEach
    void setup() {
        shopRepository = Mockito.mock(ShopRepository.class);
        discoveryService = new DiscoveryService(shopRepository);
    }

    @Test
    void findNearby_returnsMappedResults() {
        com.orioncart.dto.ShopDistance s1 = Mockito.mock(com.orioncart.dto.ShopDistance.class);
        when(s1.getId()).thenReturn(1L);
        when(s1.getName()).thenReturn("Shop A");
        when(s1.getDistance()).thenReturn(1200.5);

        com.orioncart.dto.ShopDistance s2 = Mockito.mock(com.orioncart.dto.ShopDistance.class);
        when(s2.getId()).thenReturn(2L);
        when(s2.getName()).thenReturn("Shop B");
        when(s2.getDistance()).thenReturn(2500.0);

        when(shopRepository.findNearby(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(Arrays.asList(s1, s2));

        List<Map<String, Object>> results = discoveryService.findNearby(12.0, 77.0, 5000);
        assertEquals(2, results.size());
        assertEquals(1L, results.get(0).get("id"));
        assertEquals("Shop A", results.get(0).get("name"));
        assertEquals(1200.5, (double) results.get(0).get("distance_m"));
    }
}

