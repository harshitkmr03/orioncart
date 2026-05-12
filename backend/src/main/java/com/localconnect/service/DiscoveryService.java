package com.localconnect.service;

import com.localconnect.repository.ShopRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DiscoveryService {

    private final ShopRepository shopRepository;

    public DiscoveryService(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    /**
     * Returns list of shops with distance in meters.
     */
    public List<Map<String, Object>> findNearby(double lat, double lng, double radiusMeters) {
        List<com.localconnect.dto.ShopDistance> rows = shopRepository.findNearby(lat, lng, radiusMeters);
        List<Map<String, Object>> out = new ArrayList<>();
        for (com.localconnect.dto.ShopDistance r : rows) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("distance_m", r.getDistance());
            out.add(m);
        }
        return out;
    }

    /**
     * Return typed projection results directly for controller/clients.
     */
    public List<com.localconnect.dto.ShopDistance> findNearbyProjection(double lat, double lng, double radiusMeters) {
        return shopRepository.findNearby(lat, lng, radiusMeters);
    }
}
