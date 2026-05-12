package com.localconnect.backend.controller;

import com.localconnect.backend.dto.DeliverySlotOption;
import com.localconnect.backend.dto.SellerOverviewDTO;
import com.localconnect.backend.model.Shop;
import com.localconnect.backend.service.DeliveryService;
import com.localconnect.backend.service.SellerInsightsService;
import com.localconnect.backend.service.ShopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = "*")
public class ShopController {

    @Autowired
    private ShopService shopService;

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private SellerInsightsService sellerInsightsService;

    /** Create a shop (no specific owner — admin use or legacy). */
    @PostMapping
    public Shop createShop(@RequestBody Shop shop) {
        return shopService.createShop(shop);
    }

    /** Create a new shop owned by the given user. A user may own multiple shops. */
    @PostMapping("/owner/{userId}")
    public ResponseEntity<Shop> createShopForOwner(
            @PathVariable("userId") Long userId,
            @RequestBody Shop shop) {
        return ResponseEntity.ok(shopService.createShopForOwner(shop, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shop> updateShop(
            @PathVariable("id") Long id,
            @RequestBody Shop updateData) {
        try {
            return ResponseEntity.ok(shopService.updateShop(id, updateData));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShop(@PathVariable("id") Long id) {
        shopService.deleteShop(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public List<Shop> getAllShops() {
        return shopService.getAllShops();
    }

    @GetMapping("/category/{category}")
    public List<Shop> getShopsByCategory(@PathVariable("category") String category) {
        return shopService.getShopsByCategory(category);
    }

    @GetMapping("/{id}")
    public Shop getShopById(@PathVariable("id") Long id) {
        return shopService.getShopById(id);
    }

    /**
     * Returns ALL shops owned by the given user.
     * A seller can own multiple shops — returns a JSON array.
     */
    @GetMapping("/owner/{userId}")
    public ResponseEntity<List<Shop>> getShopsByOwner(@PathVariable("userId") Long userId) {
        List<Shop> shops = shopService.getShopsByOwnerId(userId);
        return ResponseEntity.ok(shops);   // always 200, empty array = no shops yet
    }

    @GetMapping("/{shopId}/available-slots")
    public List<DeliverySlotOption> getAvailablePickupSlots(
            @PathVariable("shopId") Long shopId,
            @RequestParam(required = false) String date
    ) {
        LocalDate targetDate = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date);
        return deliveryService.getPickupSlots(shopId, targetDate);
    }

    @GetMapping("/{shopId}/analytics/overview")
    public SellerOverviewDTO getAnalyticsOverview(
            @PathVariable("shopId") Long shopId,
            @RequestParam(required = false) String date
    ) {
        LocalDate targetDate = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date);
        return sellerInsightsService.getOverview(shopId, targetDate);
    }

    /** Search shops by name (case-insensitive, partial match). */
    @GetMapping("/search")
    public List<Shop> searchShops(@RequestParam(value = "q", defaultValue = "") String query) {
        if (query == null || query.isBlank()) {
            return shopService.getAllShops();
        }
        return shopService.searchByName(query);
    }
}
