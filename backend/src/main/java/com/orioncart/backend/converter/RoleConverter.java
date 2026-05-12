package com.orioncart.backend.converter;

import com.orioncart.backend.model.User;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class RoleConverter implements AttributeConverter<User.Role, String> {

    @Override
    public String convertToDatabaseColumn(User.Role attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public User.Role convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            String v = dbData.trim().toUpperCase();
            switch (v) {
                case "CUSTOMER":
                case "CONSUMER":
                case "BUYER":
                    return User.Role.CUSTOMER;
                case "SHOPKEEPER":
                case "SELLER":
                    return User.Role.SHOPKEEPER;
                default:
                    return User.Role.valueOf(v);
            }
        } catch (IllegalArgumentException ex) {
            // unknown role -> return null to avoid failing the whole query
            return null;
        }
    }
}

