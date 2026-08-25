package com.orioncart.backend.repository;

import com.orioncart.backend.model.LoyaltyPoints;
import org.springframework.data.jpa.repository.JpaRepository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LoyaltyPointsRepository extends JpaRepository<LoyaltyPoints, Long> {
    Optional<LoyaltyPoints> findByUser_Id(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT lp FROM LoyaltyPoints lp WHERE lp.user.id = :userId")
    Optional<LoyaltyPoints> findByUserIdForUpdate(@Param("userId") Long userId);
}

