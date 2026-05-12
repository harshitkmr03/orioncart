package com.localconnect.backend.service;

import com.localconnect.backend.dto.DeliveryServiceabilityResponse;
import com.localconnect.backend.dto.DeliverySlotOption;
import com.localconnect.backend.model.Shop;
import com.localconnect.backend.repository.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class DeliveryServiceTest {

    private final ShopRepository shopRepository = Mockito.mock(ShopRepository.class);
    private DeliveryService deliveryService;

    @BeforeEach
    void setUp() {
        deliveryService = new DeliveryService();
        ReflectionTestUtils.setField(deliveryService, "shopRepository", shopRepository);
    }

    @Test
    void getPickupSlots_returnsHourlyOptions() {
        Shop shop = createShop(1L, "Fresh Mart", 22.7196, 75.8577);
        when(shopRepository.findById(1L)).thenReturn(Optional.of(shop));

        List<DeliverySlotOption> slots = deliveryService.getPickupSlots(1L, LocalDate.now().plusDays(1));

        assertFalse(slots.isEmpty());
        assertTrue(slots.stream().allMatch(slot -> "PICKUP".equals(slot.fulfillmentType())));
    }

    @Test
    void checkExpressServiceability_returnsServiceableWhenNearbyShopExists() {
        Shop shop = createShop(1L, "Fresh Mart", 22.7200, 75.8600);
        when(shopRepository.findNearby(22.7196, 75.8577, 8.0)).thenReturn(List.of(shop));

        DeliveryServiceabilityResponse response = deliveryService.checkExpressServiceability(22.7196, 75.8577);

        assertTrue(response.serviceable());
        assertTrue(response.deliveryCharge() > 0);
    }

    private Shop createShop(Long id, String name, double lat, double lon) {
        Shop shop = new Shop();
        shop.setId(id);
        shop.setName(name);
        shop.setLatitude(lat);
        shop.setLongitude(lon);
        return shop;
    }
}
