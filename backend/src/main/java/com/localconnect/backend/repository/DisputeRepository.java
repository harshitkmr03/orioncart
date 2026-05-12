package com.localconnect.backend.repository;

import com.localconnect.backend.model.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisputeRepository extends JpaRepository<Dispute, Long> {
    List<Dispute> findByCustomer_IdOrderByRaisedAtDesc(Long customerId);

    List<Dispute> findByCustomer_IdAndOrder_IdOrderByRaisedAtDesc(Long customerId, Long orderId);

    boolean existsByOrder_IdAndCustomer_Id(Long orderId, Long customerId);
}
