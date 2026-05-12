package com.localconnect.backend.service;

import com.localconnect.backend.model.Shop;
import com.localconnect.backend.model.User;
import com.localconnect.backend.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ShopService {
    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private ReviewService reviewService;

    public Shop createShop(Shop shop) {
        return shopRepository.save(shop);
    }

    public List<Shop> getAllShops() {
        return enrichShops(shopRepository.findAll());
    }

    public List<Shop> getShopsByCategory(String category) {
        return enrichShops(shopRepository.findByCategory(category));
    }

    public Shop getShopById(Long id) {
        return shopRepository.findById(id)
                .map(this::enrichShop)
                .orElse(null);
    }

    public List<Shop> searchByName(String query) {
        return enrichShops(shopRepository.findByNameContainingIgnoreCase(query));
    }

    /**
     * Returns ALL shops owned by the given user.
     * A seller may own multiple shops.
     */
    public List<Shop> getShopsByOwnerId(Long ownerId) {
        return enrichShops(shopRepository.findByOwnerId(ownerId));
    }

    /**
     * Convenience method — returns the first shop of an owner (for backwards-compat callers).
     */
    public Optional<Shop> getShopByOwnerId(Long ownerId) {
        List<Shop> shops = getShopsByOwnerId(ownerId);
        return shops.isEmpty() ? Optional.empty() : Optional.of(shops.get(0));
    }

    public Shop createShopForOwner(Shop shop, Long ownerId) {
        User owner = new User();
        owner.setId(ownerId);
        shop.setOwner(owner);
        return shopRepository.save(shop);
    }

    public Shop updateShop(Long id, Shop updateData) {
        return shopRepository.findById(id).map(shop -> {
            if (updateData.getName() != null) shop.setName(updateData.getName());
            if (updateData.getDescription() != null) shop.setDescription(updateData.getDescription());
            if (updateData.getCategory() != null) shop.setCategory(updateData.getCategory());
            if (updateData.getAddress() != null) shop.setAddress(updateData.getAddress());
            if (updateData.getLatitude() != null) shop.setLatitude(updateData.getLatitude());
            if (updateData.getLongitude() != null) shop.setLongitude(updateData.getLongitude());
            if (updateData.getImage() != null) shop.setImage(updateData.getImage());
            return shopRepository.save(shop);
        }).orElseThrow(() -> new IllegalArgumentException("Shop not found with id: " + id));
    }

    public void deleteShop(Long id) {
        shopRepository.deleteById(id);
    }

    // ── Enrichment helpers ───────────────────────────────────────────────────

    private List<Shop> enrichShops(List<Shop> shops) {
        if (shops == null || shops.isEmpty()) {
            return List.of();
        }

        List<Long> shopIds = shops.stream().map(Shop::getId).toList();
        Map<Long, ReviewService.ShopReviewSnapshot> stats = new LinkedHashMap<>(reviewService.getShopReviewSnapshots(shopIds));
        List<Shop> enriched = new ArrayList<>();
        for (Shop shop : shops) {
            ReviewService.ShopReviewSnapshot snapshot = stats.get(shop.getId());
            shop.setRating(snapshot != null ? snapshot.averageRating() : null);
            shop.setReviewCount(snapshot != null ? (int) snapshot.reviewCount() : 0);
            enriched.add(shop);
        }
        return enriched;
    }

    private Shop enrichShop(Shop shop) {
        if (shop == null) {
            return null;
        }
        ReviewService.ShopReviewSnapshot snapshot = reviewService.getShopReviewSnapshot(shop.getId());
        shop.setRating(snapshot.averageRating());
        shop.setReviewCount((int) snapshot.reviewCount());
        return shop;
    }
}
