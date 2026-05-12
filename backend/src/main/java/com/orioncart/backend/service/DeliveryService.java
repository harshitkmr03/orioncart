package com.orioncart.backend.service;

import com.orioncart.backend.dto.DeliveryServiceabilityResponse;
import com.orioncart.backend.dto.DeliverySlotOption;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class DeliveryService {
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter SLOT_LABEL_FORMAT = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    @Autowired
    private ShopRepository shopRepository;

    public List<DeliverySlotOption> getPickupSlots(Long shopId, LocalDate date) {
        if (shopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop id is required");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        LocalDate requestedDate = date == null ? LocalDate.now() : date;
        LocalTime earliestTime = requestedDate.equals(LocalDate.now())
                ? LocalTime.now().plusHours(1).withMinute(0).withSecond(0).withNano(0)
                : LocalTime.of(9, 0);

        LocalTime start = maxTime(LocalTime.of(9, 0), earliestTime);
        LocalTime close = LocalTime.of(21, 0);
        List<DeliverySlotOption> slots = new ArrayList<>();

        for (LocalTime current = start; current.isBefore(close); current = current.plusHours(1)) {
            LocalTime end = current.plusHours(1);
            String label = requestedDate.equals(LocalDate.now()) ? "Today" : requestedDate.toString();
            slots.add(new DeliverySlotOption(
                    requestedDate + "-pickup-" + current,
                    Order.DeliveryMethod.PICKUP.name(),
                    label,
                    current.format(TIME_FORMAT),
                    end.format(TIME_FORMAT),
                    current.format(SLOT_LABEL_FORMAT) + " - " + end.format(SLOT_LABEL_FORMAT),
                    0,
                    null,
                    true
            ));
        }

        if (slots.isEmpty()) {
            slots.add(new DeliverySlotOption(
                    requestedDate + "-pickup-next",
                    Order.DeliveryMethod.PICKUP.name(),
                    "Next available",
                    "09:00",
                    "10:00",
                    "9:00 AM - 10:00 AM",
                    0,
                    null,
                    false
            ));
        }

        return slots;
    }

    public List<DeliverySlotOption> getScheduledSlots(LocalDate date) {
        LocalDate requestedDate = date == null ? LocalDate.now() : date;
        LocalTime now = LocalTime.now();

        List<SlotTemplate> templates = List.of(
                new SlotTemplate("MORNING", LocalTime.of(9, 0), LocalTime.of(11, 0), LocalTime.of(8, 0), 15),
                new SlotTemplate("AFTERNOON", LocalTime.of(13, 0), LocalTime.of(15, 0), LocalTime.of(12, 0), 15),
                new SlotTemplate("EVENING", LocalTime.of(18, 0), LocalTime.of(20, 0), LocalTime.of(17, 0), 20)
        );

        List<DeliverySlotOption> slots = new ArrayList<>();
        for (SlotTemplate template : templates) {
            boolean available = !requestedDate.isBefore(LocalDate.now())
                    && (!requestedDate.equals(LocalDate.now()) || now.isBefore(template.cutoffTime()));

            slots.add(new DeliverySlotOption(
                    requestedDate + "-scheduled-" + template.id(),
                    Order.DeliveryMethod.SCHEDULED.name(),
                    template.id(),
                    template.startTime().format(TIME_FORMAT),
                    template.endTime().format(TIME_FORMAT),
                    template.startTime().format(SLOT_LABEL_FORMAT) + " - " + template.endTime().format(SLOT_LABEL_FORMAT),
                    template.charge(),
                    template.cutoffTime().format(TIME_FORMAT),
                    available
            ));
        }

        return slots;
    }

    public DeliveryServiceabilityResponse checkExpressServiceability(double lat, double lon) {
        List<Shop> nearbyShops = shopRepository.findNearby(lat, lon, 8.0);
        if (nearbyShops.isEmpty()) {
            return new DeliveryServiceabilityResponse(
                    false,
                    null,
                    "shiprocket_hyperlocal",
                    null,
                    null,
                    null,
                    "Express delivery is not available for this area yet."
            );
        }

        Shop nearestShop = nearbyShops.stream()
                .min(Comparator.comparingDouble(shop -> distanceFrom(lat, lon, shop)))
                .orElse(null);

        if (nearestShop == null) {
            return new DeliveryServiceabilityResponse(
                    false,
                    null,
                    "shiprocket_hyperlocal",
                    null,
                    null,
                    null,
                    "Express delivery is not available for this area yet."
            );
        }

        double distanceKm = distanceFrom(lat, lon, nearestShop);
        return buildExpressResponse(nearestShop, distanceKm, true);
    }

    public PricingBreakdown calculateOrderPricing(Order order, Set<Shop> orderShops) {
        Order.DeliveryMethod fulfillmentType = order.getFulfillmentType();
        if (fulfillmentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fulfillment type is required");
        }

        if (fulfillmentType == Order.DeliveryMethod.PICKUP) {
            if (orderShops.size() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup is available only for single-shop orders");
            }
            return new PricingBreakdown(0, null, "self_pickup");
        }

        if (order.getDeliveryAddress() == null || order.getDeliveryAddress().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery address is required");
        }

        if (fulfillmentType == Order.DeliveryMethod.SCHEDULED) {
            if (order.getScheduledSlot() == null || order.getScheduledSlot().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scheduled delivery slot is required");
            }
            return new PricingBreakdown(15, null, "orioncart_scheduled");
        }

        if (orderShops.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Express delivery is available only for single-shop orders");
        }

        if (order.getDeliveryLatitude() == null || order.getDeliveryLongitude() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery coordinates are required for express delivery");
        }

        Shop shop = orderShops.iterator().next();
        if (shop.getLatitude() == null || shop.getLongitude() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop location is unavailable for express delivery");
        }

        double distanceKm = calculateDistanceKm(order.getDeliveryLatitude(), order.getDeliveryLongitude(), shop.getLatitude(), shop.getLongitude());
        DeliveryServiceabilityResponse response = buildExpressResponse(shop, distanceKm, distanceKm <= 8.0);
        if (!response.serviceable()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, response.message());
        }

        return new PricingBreakdown(response.deliveryCharge(), response.estimatedMinutes(), response.partner());
    }

    private DeliveryServiceabilityResponse buildExpressResponse(Shop shop, double distanceKm, boolean serviceable) {
        int estimatedMinutes = estimateExpressMinutes(distanceKm);
        int charge = calculateExpressCharge(distanceKm);

        return new DeliveryServiceabilityResponse(
                serviceable,
                serviceable ? estimatedMinutes : null,
                "shiprocket_hyperlocal",
                serviceable ? charge : null,
                shop.getId(),
                shop.getName(),
                serviceable
                        ? "Express delivery available from " + shop.getName()
                        : "Express delivery is not available for this address."
        );
    }

    private double distanceFrom(double lat, double lon, Shop shop) {
        if (shop.getLatitude() == null || shop.getLongitude() == null) {
            return Double.MAX_VALUE;
        }
        return calculateDistanceKm(lat, lon, shop.getLatitude(), shop.getLongitude());
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

    private int estimateExpressMinutes(double distanceKm) {
        return (int) Math.round(10 + (distanceKm * 3));
    }

    private int calculateExpressCharge(double distanceKm) {
        if (distanceKm <= 2.0) {
            return 20;
        }
        if (distanceKm <= 5.0) {
            return 35;
        }
        return 50;
    }

    private LocalTime maxTime(LocalTime first, LocalTime second) {
        return first.isAfter(second) ? first : second;
    }

    private record SlotTemplate(String id, LocalTime startTime, LocalTime endTime, LocalTime cutoffTime, int charge) {
    }

    public record PricingBreakdown(Integer deliveryCharge, Integer estimatedMinutes, String partner) {
    }
}

