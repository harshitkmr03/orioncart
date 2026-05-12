package com.localconnect.backend.service;

import com.localconnect.backend.dto.DiscoveryShopResult;
import com.localconnect.backend.dto.NearbyProductSearchResult;
import com.localconnect.backend.model.Product;
import com.localconnect.backend.model.Shop;
import com.localconnect.backend.repository.ProductRepository;
import com.localconnect.backend.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class DiscoveryService {
    private static final double MAX_RADIUS_KM = 20.0;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ReviewService reviewService;

    /**
     * Returns all shops within radiusKm of the given location.
     * Shops without coordinates are excluded (they have no lat/lon to measure).
     */
    public List<DiscoveryShopResult> discoverNearby(
            double lat,
            double lon,
            double radiusKm,
            String categories,
            String query,
            String sortBy,
            Double minRating
    ) {
        validateRadius(radiusKm);
        validateMinRating(minRating);

        Set<String> requestedCategories = parseCategories(categories);
        Predicate<Shop> matchesCategory = shop -> requestedCategories.isEmpty()
                || requestedCategories.contains(normalize(shop.getCategory()));
        Predicate<Shop> matchesQuery = shop -> matchesQuery(query,
                shop.getName(),
                shop.getCategory(),
                shop.getAddress()
        );

        List<Shop> nearbyShops = shopRepository.findNearby(lat, lon, radiusKm);
        Map<Long, ReviewService.ShopReviewSnapshot> reviewSnapshots = reviewService.getShopReviewSnapshots(
                nearbyShops.stream().map(Shop::getId).toList()
        );

        return nearbyShops.stream()
                .filter(matchesCategory)
                .filter(matchesQuery)
                .map(shop -> toDiscoveryShopResult(shop, lat, lon, reviewSnapshots.get(shop.getId())))
                .filter(result -> minRating == null || (result.rating() != null && result.rating() >= minRating))
                .sorted(shopComparator(sortBy))
                .toList();
    }

    /**
     * Returns ALL shops regardless of whether they have coordinates.
     * Shops with coordinates will have distanceKm/etaMinutes populated if
     * the caller provides an origin lat/lon. Shops without coordinates will
     * have those fields as null.
     */
    public List<DiscoveryShopResult> discoverAll(
            Double originLat,
            Double originLon,
            String categories,
            String query,
            String sortBy,
            Double minRating
    ) {
        validateMinRating(minRating);

        Set<String> requestedCategories = parseCategories(categories);
        Predicate<Shop> matchesCategory = shop -> requestedCategories.isEmpty()
                || requestedCategories.contains(normalize(shop.getCategory()));
        Predicate<Shop> matchesQuery = shop -> matchesQuery(query,
                shop.getName(),
                shop.getCategory(),
                shop.getAddress()
        );

        List<Shop> allShops = shopRepository.findAll();
        Map<Long, ReviewService.ShopReviewSnapshot> reviewSnapshots = reviewService.getShopReviewSnapshots(
                allShops.stream().map(Shop::getId).toList()
        );

        return allShops.stream()
                .filter(matchesCategory)
                .filter(matchesQuery)
                .map(shop -> toDiscoveryShopResult(shop, originLat, originLon, reviewSnapshots.get(shop.getId())))
                .filter(result -> minRating == null || (result.rating() != null && result.rating() >= minRating))
                .sorted(shopComparator(sortBy != null ? sortBy : "newest"))
                .toList();
    }

    public List<NearbyProductSearchResult> searchNearbyProducts(
            String query,
            double lat,
            double lon,
            double radiusKm,
            String categories
    ) {
        validateRadius(radiusKm);
        if (query == null || query.isBlank()) {
            return List.of();
        }

        Set<String> requestedCategories = parseCategories(categories);
        List<Shop> nearbyShops = shopRepository.findNearby(lat, lon, radiusKm).stream()
                .filter(shop -> requestedCategories.isEmpty() || requestedCategories.contains(normalize(shop.getCategory())))
                .toList();

        if (nearbyShops.isEmpty()) {
            return List.of();
        }

        Map<Long, ReviewService.ShopReviewSnapshot> reviewSnapshots = reviewService.getShopReviewSnapshots(
                nearbyShops.stream().map(Shop::getId).toList()
        );

        Map<Long, DiscoveryShopResult> shopsById = nearbyShops.stream()
                .map(shop -> toDiscoveryShopResult(shop, lat, lon, reviewSnapshots.get(shop.getId())))
                .collect(Collectors.toMap(DiscoveryShopResult::id, result -> result));

        List<Long> shopIds = new ArrayList<>(shopsById.keySet());
        if (shopIds.isEmpty()) {
            return List.of();
        }

        return productRepository.findByShopIdInOrderByNameAsc(shopIds).stream()
                .filter(product -> matchesQuery(query,
                        product.getName(),
                        product.getCategory(),
                        product.getDescription(),
                        product.getSku()
                ))
                .map(product -> toNearbyProductResult(product, shopsById.get(product.getShop().getId())))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing(NearbyProductSearchResult::distanceKm, Comparator.nullsLast(Double::compareTo))
                        .thenComparing(result -> normalize(result.productName())))
                .limit(12)
                .toList();
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private DiscoveryShopResult toDiscoveryShopResult(
            Shop shop,
            Double originLat,
            Double originLon,
            ReviewService.ShopReviewSnapshot reviewSnapshot
    ) {
        Double distanceKm = null;
        Integer etaMinutes = null;
        if (originLat != null && originLon != null
                && shop.getLatitude() != null && shop.getLongitude() != null) {
            distanceKm = roundToSingleDecimal(
                    calculateDistanceKm(originLat, originLon, shop.getLatitude(), shop.getLongitude())
            );
            etaMinutes = estimateEtaMinutes(distanceKm);
        }

        return new DiscoveryShopResult(
                shop.getId(),
                shop.getName(),
                shop.getCategory(),
                shop.getAddress(),
                shop.getLatitude(),
                shop.getLongitude(),
                shop.getImage(),
                distanceKm,
                etaMinutes,
                "Hours unavailable",
                reviewSnapshot != null ? reviewSnapshot.averageRating() : null,
                reviewSnapshot != null ? (int) reviewSnapshot.reviewCount() : 0
        );
    }

    private NearbyProductSearchResult toNearbyProductResult(Product product, DiscoveryShopResult shop) {
        if (shop == null) {
            return null;
        }

        return new NearbyProductSearchResult(
                product.getId(),
                product.getName(),
                product.getCategory(),
                product.getSku(),
                product.getPrice(),
                product.getStockQuantity(),
                product.getImageUrl(),
                shop.id(),
                shop.name(),
                shop.category(),
                shop.address(),
                shop.distanceKm(),
                shop.etaMinutes()
        );
    }

    private Comparator<DiscoveryShopResult> shopComparator(String sortBy) {
        String normalizedSort = normalize(sortBy);
        if ("eta".equals(normalizedSort)) {
            return Comparator.comparing(DiscoveryShopResult::etaMinutes, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(DiscoveryShopResult::distanceKm, Comparator.nullsLast(Double::compareTo));
        }
        if ("rating".equals(normalizedSort)) {
            return Comparator.comparing(DiscoveryShopResult::rating, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(DiscoveryShopResult::reviewCount, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(DiscoveryShopResult::distanceKm, Comparator.nullsLast(Double::compareTo));
        }
        if ("name".equals(normalizedSort)) {
            return Comparator.comparing(result -> normalize(result.name()));
        }
        if ("newest".equals(normalizedSort)) {
            return Comparator.comparing(DiscoveryShopResult::id, Comparator.nullsLast(Long::compareTo)).reversed();
        }
        // default: distance (nulls last so shops without coordinates appear after located ones)
        return Comparator.comparing(DiscoveryShopResult::distanceKm, Comparator.nullsLast(Double::compareTo))
                .thenComparing(result -> normalize(result.name()));
    }

    private boolean matchesQuery(String query, String... values) {
        String normalizedQuery = normalize(query);
        if (normalizedQuery.isBlank()) {
            return true;
        }

        for (String value : values) {
            if (normalize(value).contains(normalizedQuery)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> parseCategories(String categories) {
        if (categories == null || categories.isBlank()) {
            return Set.of();
        }

        return java.util.Arrays.stream(categories.split(","))
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void validateRadius(double radiusKm) {
        if (radiusKm < 0 || radiusKm > MAX_RADIUS_KM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Radius must be between 0 and 20 km");
        }
    }

    private void validateMinRating(Double minRating) {
        if (minRating != null && (minRating < 0 || minRating > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum rating must be between 0 and 5");
        }
    }

    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private double roundToSingleDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private int estimateEtaMinutes(double distanceKm) {
        return (int) Math.round(10 + (distanceKm * 3));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
