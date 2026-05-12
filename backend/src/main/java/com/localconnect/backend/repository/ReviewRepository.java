package com.localconnect.backend.repository;

import com.localconnect.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByShop_IdOrderByCreatedAtDesc(Long shopId);

    boolean existsByShop_IdAndBuyer_IdAndOrderId(Long shopId, Long buyerId, Long orderId);

    @Query("""
            select r.shop.id as shopId,
                   coalesce(avg(r.rating), 0) as averageRating,
                   count(r) as reviewCount
            from Review r
            where r.shop.id in :shopIds
            group by r.shop.id
            """)
    List<ShopReviewStats> summarizeByShopIds(@Param("shopIds") Collection<Long> shopIds);

    @Query("""
            select coalesce(avg(r.rating), 0)
            from Review r
            where r.shop.id = :shopId
            """)
    Double averageRatingForShop(@Param("shopId") Long shopId);

    long countByShop_Id(Long shopId);

    interface ShopReviewStats {
        Long getShopId();
        Double getAverageRating();
        Long getReviewCount();
    }
}
