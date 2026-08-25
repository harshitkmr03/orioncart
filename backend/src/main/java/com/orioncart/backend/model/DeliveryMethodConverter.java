package com.orioncart.backend.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DeliveryMethodConverter implements AttributeConverter<Order.DeliveryMethod, String> {

    @Override
    public String convertToDatabaseColumn(Order.DeliveryMethod attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public Order.DeliveryMethod convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        String v = dbData.trim().toUpperCase();
        switch (v) {
            case "PICKUP":
            case "SELF_PICKUP": // legacy value
                return Order.DeliveryMethod.PICKUP;
            case "SCHEDULED":
                return Order.DeliveryMethod.SCHEDULED;
            case "AGENT":
            case "EXPRESS": // legacy value -> mapped to AGENT
            case "DELIVERY": // legacy synonym
                return Order.DeliveryMethod.AGENT;
            default:
                try {
                    return Order.DeliveryMethod.valueOf(v);
                } catch (IllegalArgumentException ex) {
                    throw new IllegalArgumentException("Unknown delivery method from DB: " + dbData, ex);
                }
        }
    }
}

