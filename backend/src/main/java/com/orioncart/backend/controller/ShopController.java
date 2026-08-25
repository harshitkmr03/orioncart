package com.orioncart.backend.controller;

import com.orioncart.backend.dto.DeliverySlotOption;
import com.orioncart.backend.dto.SellerOverviewDTO;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.service.DeliveryService;
import com.orioncart.backend.service.SellerInsightsService;
import com.orioncart.backend.service.ShopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.orioncart.backend.service.AuthService;
import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = "*")
public class ShopController {

    @Autowired
    private ShopService shopService;

    @Autowired
    private AuthService authService;

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private SellerInsightsService sellerInsightsService;

    /** Create a shop (no specific owner — admin use or legacy). */
    @PostMapping
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public Shop createShop(@RequestHeader(value = "X-Auth-Token", required = false) String token, @RequestBody Shop shop) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return shopService.createShop(shop);
    }

    /** Create a new shop owned by the given user. A user may own multiple shops. */
    @PostMapping("/owner/{userId}")
    public ResponseEntity<Shop> createShopForOwner(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable("userId") Long userId,
            @RequestBody Shop shop) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(shopService.createShopForOwner(shop, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shop> updateShop(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable("id") Long id,
            @RequestBody Shop updateData) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        try {
            return ResponseEntity.ok(shopService.updateShop(id, updateData));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShop(@RequestHeader(value = "X-Auth-Token", required = false) String token, @PathVariable("id") Long id) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
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

