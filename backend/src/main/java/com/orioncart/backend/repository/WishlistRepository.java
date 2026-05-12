package com.orioncart.backend.repository;

import com.orioncart.backend.model.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    List<Wishlist> findByBuyer_IdOrderByCreatedAtDesc(Long buyerId);

    boolean existsByBuyer_IdAndProduct_Id(Long buyerId, Long productId);

    @Transactional
    void deleteByBuyer_IdAndProduct_Id(Long buyerId, Long productId);
}

