package com.orioncart.service;

import com.orioncart.domain.Product;
import com.orioncart.domain.Shop;
import com.orioncart.repository.ProductRepository;
import com.orioncart.repository.ShopRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;

    public ProductService(ProductRepository productRepository, ShopRepository shopRepository) {
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
    }

    public List<Product> getProductsByShop(Long shopId) {
        return productRepository.findByShopId(shopId);
    }

    public Product addProduct(Product product) {
        if (product.getShop() != null && product.getShop().getId() != null) {
            Shop s = shopRepository.findById(product.getShop().getId())
                    .orElseThrow(() -> new RuntimeException("Shop not found"));
            product.setShop(s);
        }
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product updated) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setStockQuantity(updated.getStockQuantity());
        existing.setImageUrl(updated.getImageUrl());
        existing.setCategory(updated.getCategory());

        return productRepository.save(existing);
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}

