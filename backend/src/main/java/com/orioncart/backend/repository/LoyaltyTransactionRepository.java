package com.orioncart.backend.repository;

import com.orioncart.backend.model.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {
    List<LoyaltyTransaction> findByUser_IdOrderByCreatedAtDesc(Long userId);

    boolean existsByUser_IdAndTransactionTypeAndReferenceId(Long userId, String transactionType, Long referenceId);

    boolean existsByUser_IdAndTransactionType(Long userId, String transactionType);
}

