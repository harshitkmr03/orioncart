package com.localconnect.backend.repository;

import com.localconnect.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomer_Id(Long customerId);

    List<Order> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);

    long countByCustomer_Id(Long customerId);
}
