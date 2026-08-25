package com.orioncart.backend.service;

import com.orioncart.backend.dto.WishlistItemDTO;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.User;
import com.orioncart.backend.model.Wishlist;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.UserRepository;
import com.orioncart.backend.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class WishlistService {

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    public List<WishlistItemDTO> getWishlist(Long buyerId) {
        return wishlistRepository.findByBuyer_IdOrderByCreatedAtDesc(buyerId).stream()
                .map(this::toDto)
                .toList();
    }

    public List<WishlistItemDTO> addToWishlist(Long buyerId, Long productId) {
        if (wishlistRepository.existsByBuyer_IdAndProduct_Id(buyerId, productId)) {
            return getWishlist(buyerId);
        }

        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        Wishlist wishlist = new Wishlist();
        wishlist.setBuyer(buyer);
        wishlist.setProduct(product);
        wishlist.setCreatedAt(LocalDateTime.now());
        wishlistRepository.save(wishlist);

        return getWishlist(buyerId);
    }

    @Transactional
    public List<WishlistItemDTO> removeFromWishlist(Long buyerId, Long productId) {
        wishlistRepository.deleteByBuyer_IdAndProduct_Id(buyerId, productId);
        return getWishlist(buyerId);
    }

    private WishlistItemDTO toDto(Wishlist wishlist) {
        Product product = wishlist.getProduct();
        return new WishlistItemDTO(
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                product != null ? product.getCategory() : null,
                product != null ? product.getPrice() : 0,
                product != null ? product.getStockQuantity() : 0,
                product != null ? product.getImageUrl() : null,
                product != null && product.getShop() != null ? product.getShop().getId() : null,
                product != null && product.getShop() != null ? product.getShop().getName() : null,
                wishlist.getCreatedAt()
        );
    }
}

