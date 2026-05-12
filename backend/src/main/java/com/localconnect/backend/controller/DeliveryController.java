package com.localconnect.backend.controller;

import com.localconnect.backend.dto.DeliveryServiceabilityResponse;
import com.localconnect.backend.dto.DeliverySlotOption;
import com.localconnect.backend.service.DeliveryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/delivery")
@CrossOrigin(origins = "*")
public class DeliveryController {

    @Autowired
    private DeliveryService deliveryService;

    @GetMapping("/slots")
    public List<DeliverySlotOption> getScheduledSlots(
            @RequestParam double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String date
    ) {
        resolveLongitude(lon, lng);
        LocalDate targetDate = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date);
        return deliveryService.getScheduledSlots(targetDate);
    }

    @GetMapping("/serviceability")
    public DeliveryServiceabilityResponse checkServiceability(
            @RequestParam double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double lng
    ) {
        return deliveryService.checkExpressServiceability(lat, resolveLongitude(lon, lng));
    }

    private double resolveLongitude(Double lon, Double lng) {
        if (lon != null) {
            return lon;
        }
        if (lng != null) {
            return lng;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Longitude is required");
    }
}
