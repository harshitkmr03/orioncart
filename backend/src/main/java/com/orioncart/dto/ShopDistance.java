package com.orioncart.dto;

/**
 * Projection for nearby shop results (id, name, distance in meters).
 */
public interface ShopDistance {
    Long getId();
    String getName();
    Double getDistance();
}

