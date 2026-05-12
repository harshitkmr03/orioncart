package com.localconnect.repository;

import com.localconnect.domain.Shop;
import com.localconnect.dto.ShopDistance;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShopRepository extends CrudRepository<Shop, Long> {

    // native query returning id, name and distance in meters mapped to ShopDistance projection
    @Query(value = "SELECT s.id as id, s.name as name, ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat),4326)::geography) as distance " +
            "FROM shop s WHERE ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat),4326)::geography, :radius) " +
            "ORDER BY distance",
            nativeQuery = true)
    List<ShopDistance> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radius") double radiusMeters);
}
