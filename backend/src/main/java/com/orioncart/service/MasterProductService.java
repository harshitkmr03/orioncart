package com.orioncart.service;

import com.orioncart.domain.MasterProduct;
import com.orioncart.repository.MasterProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MasterProductService {

    private final MasterProductRepository repository;

    public MasterProductService(MasterProductRepository repository) {
        this.repository = repository;
    }

    public List<MasterProduct> search(String q) {
        if (q == null || q.isBlank()) return repository.findAll();
        return repository.findByNameContainingIgnoreCase(q.trim());
    }

    public MasterProduct add(MasterProduct p) {
        if (p.getBarcode() != null && repository.existsByBarcode(p.getBarcode())) {
            throw new IllegalArgumentException("Product with this barcode already exists");
        }
        return repository.save(p);
    }
}

