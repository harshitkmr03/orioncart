package com.localconnect.backend.repository;

import com.localconnect.backend.model.Referral;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferralRepository extends JpaRepository<Referral, Long> {
    Optional<Referral> findByReferee_Id(Long refereeId);

    List<Referral> findByReferrer_IdOrderByCreatedAtDesc(Long referrerId);

    long countByReferrer_IdAndStatus(Long referrerId, String status);
}
