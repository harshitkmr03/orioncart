package com.localconnect.backend.controller;

import com.localconnect.backend.dto.DiscoveryShopResult;
import com.localconnect.backend.model.Shop;
import com.localconnect.backend.service.DiscoveryService;
import com.localconnect.backend.service.ReviewService;
import com.localconnect.backend.service.ShopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discovery")
@CrossOrigin(origins = "*")
public class DiscoveryController {

    @Autowired
    private DiscoveryService discoveryService;

    @Autowired
    private ShopService shopService;

    /**
     * Primary discovery endpoint: returns shops within the requested radius.
     * Requires lat + lon (lon or lng alias accepted).
     */
    @GetMapping
    public List<DiscoveryShopResult> discoverNearby(
            @RequestParam double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(required = false) String categories,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(defaultValue = "distance") String sortBy,
            @RequestParam(required = false) Double minRating
    ) {
        return discoveryService.discoverNearby(
                lat, resolveLongitude(lon, lng), radiusKm,
                categories, query, sortBy, minRating
        );
    }

    /**
     * Fallback endpoint: returns ALL shops (with or without coordinates).
     * Used by the Discover page when the geo-radius query returns no results,
     * or when a new shop has been created without a location yet.
     * Accepts optional lat/lon to compute distance for shops that do have coordinates.
     */
    @GetMapping("/all")
    public List<DiscoveryShopResult> discoverAll(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String categories,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(defaultValue = "newest") String sortBy,
            @RequestParam(required = false) Double minRating
    ) {
        Double resolvedLon = (lon != null) ? lon : lng;
        return discoveryService.discoverAll(lat, resolvedLon, categories, query, sortBy, minRating);
    }

    private double resolveLongitude(Double lon, Double lng) {
        if (lon != null) return lon;
        if (lng != null) return lng;
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Longitude is required");
    }
}
