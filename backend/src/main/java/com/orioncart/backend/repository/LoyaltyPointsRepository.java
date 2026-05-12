package com.orioncart.backend.repository;

import com.orioncart.backend.model.LoyaltyPoints;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoyaltyPointsRepository extends JpaRepository<LoyaltyPoints, Long> {
    Optional<LoyaltyPoints> findByUser_Id(Long userId);
}

