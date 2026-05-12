package com.localconnect.repository;

import com.localconnect.domain.MasterProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MasterProductRepository extends JpaRepository<MasterProduct, Long> {
    List<MasterProduct> findByNameContainingIgnoreCase(String query);
    boolean existsByBarcode(String barcode);
}
