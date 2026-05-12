package com.localconnect.controller;

import com.localconnect.service.DiscoveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/discovery")
public class DiscoveryController {

    private final DiscoveryService discoveryService;

    public DiscoveryController(DiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> findNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5000") int radiusMeters
    ) {
        if (radiusMeters < 0 || radiusMeters > 20000) {
            return ResponseEntity.badRequest().build();
        }
        List<Map<String, Object>> results = discoveryService.findNearby(lat, lng, radiusMeters);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/dto")
    public ResponseEntity<List<com.localconnect.dto.ShopDistance>> findNearbyDto(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5000") int radiusMeters
    ) {
        if (radiusMeters < 0 || radiusMeters > 20000) {
            return ResponseEntity.badRequest().build();
        }
        List<com.localconnect.dto.ShopDistance> results = discoveryService.findNearbyProjection(lat, lng, radiusMeters);
        return ResponseEntity.ok(results);
    }
}
