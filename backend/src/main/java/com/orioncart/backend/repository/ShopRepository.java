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

    // Supabase schema stores categories in a separate table `shop_categories`.
    @Query(value = "SELECT s.* FROM shop s JOIN shop_categories sc ON s.id = sc.shop_id WHERE sc.categories = :category", nativeQuery = true)
    List<Shop> findByCategory(@Param("category") String category);

    // Find nearby shops using Haversine formula (distance in km) — avoids requiring PostGIS.
    @Query(value = "SELECT s.* FROM shop s WHERE (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(s.latitude)))) <= :radius ORDER BY (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(s.latitude))))", nativeQuery = true)
    List<Shop> findNearby(@Param("lat") double lat, @Param("lon") double lon, @Param("radius") double radius);

    List<Shop> findByNameContainingIgnoreCase(String name);
}

