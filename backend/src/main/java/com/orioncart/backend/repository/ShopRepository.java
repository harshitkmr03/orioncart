package com.orioncart.backend.repository;

import com.orioncart.backend.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ShopRepository extends JpaRepository<Shop, Long> {

    /** Returns ALL shops owned by a given user (a seller can have multiple shops). */
    List<Shop> findByOwnerId(Long ownerId);

    @Query(value = "SELECT s.* FROM shop s WHERE LOWER(s.category) = LOWER(:category)", nativeQuery = true)
    List<Shop> findByCategory(@Param("category") String category);

    // Find nearby shops using PostGIS spatial indexing (distance in km converted to meters for geography)
    @Query(value = "SELECT s.* FROM shop s " +
            "WHERE s.location IS NOT NULL " +
            "AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radius * 1000) " +
            "ORDER BY ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)",
            nativeQuery = true)
    List<Shop> findNearby(@Param("lat") double lat, @Param("lon") double lon, @Param("radius") double radius);

    List<Shop> findByNameContainingIgnoreCase(String name);
}

