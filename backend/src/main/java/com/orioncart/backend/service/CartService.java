package com.orioncart.backend.service;

import com.orioncart.backend.dto.CartItemDTO;
import com.orioncart.backend.dto.CartItemRequest;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.model.Cart;
import com.orioncart.backend.model.CartItem;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.CartRepository;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CartService {

    @Autowired private CartRepository cartRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;

    // ----------------------------------------------------------------
    // Internal helper: find or create a Cart for the given userId
    // ----------------------------------------------------------------
    @Transactional
    public Cart getOrCreateCart(Long userId) {
        User user = lockUser(userId);
        return cartRepository.findByUserId(userId).orElseGet(() -> createCart(user));
    }

    // ----------------------------------------------------------------
    // GET /api/cart  — fetch current cart as response DTO
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            // No cart yet — return empty response
            CartResponse empty = new CartResponse();
            empty.setItems(List.of());
            empty.setTotalItems(0);
            empty.setSubtotal(0);
            return empty;
        }
        return toCartResponse(cartOpt.get());
    }

    // ----------------------------------------------------------------
    // POST /api/cart/items  — add item (upsert: merge qty if exists)
    // ----------------------------------------------------------------
    @Transactional
    public CartResponse addItem(Long userId, CartItemRequest request) {
        validateRequest(request);
        Product product = findProduct(request.getProductId());
        Cart cart = getOrCreateCart(userId);
        addProduct(cart, product, request.getQuantity());
        return toCartResponse(cartRepository.save(cart));
    }

    // ----------------------------------------------------------------
    // PUT /api/cart/items/{productId}?qty=N  — set absolute quantity
    // ----------------------------------------------------------------
    @Transactional
    public CartResponse updateQuantity(Long userId, Long productId, int newQty) {
        if (productId == null || newQty < 0) {
            throw new IllegalArgumentException("productId must be valid and quantity cannot be negative");
        }

        lockUser(userId);
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            if (newQty == 0) {
                return emptyCartResponse();
            }
            throw new IllegalArgumentException("Item not in cart");
        }

        Cart cart = cartOpt.get();
        CartItem item = cart.getItems().stream()
                .filter(cartItem -> productId.equals(cartItem.getProduct().getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Item not in cart"));
        if (newQty == 0) {
            cart.getItems().remove(item);
        } else {
            validateAvailableStock(item.getProduct(), newQty);
            item.setQuantity(newQty);
            item.setPrice(item.getProduct().getPrice());
        }

        touch(cart);
        return toCartResponse(cartRepository.save(cart));
    }

    // ----------------------------------------------------------------
    // DELETE /api/cart/items/{productId}  — remove a single item
    // ----------------------------------------------------------------
    @Transactional
    public CartResponse removeItem(Long userId, Long productId) {
        lockUser(userId);
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            cart.getItems().removeIf(item -> productId.equals(item.getProduct().getId()));
            touch(cart);
            return toCartResponse(cartRepository.save(cart));
        }
        return emptyCartResponse();
    }

    // ----------------------------------------------------------------
    // DELETE /api/cart  — clear all items (called after order placed)
    // ----------------------------------------------------------------
    @Transactional
    public void clearCart(Long userId) {
        lockUser(userId);
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.getItems().clear();
            touch(cart);
            cartRepository.save(cart);
        });
    }

    // ----------------------------------------------------------------
    // POST /api/cart/merge  — merge guest localStorage items on login
    // Items: list of CartItemRequest from guest session
    // ----------------------------------------------------------------
    @Transactional
    public CartResponse mergeGuestCart(Long userId, List<CartItemRequest> guestItems) {
        if (guestItems == null || guestItems.isEmpty()) {
            return getCart(userId);
        }

        Map<Long, Integer> quantitiesByProduct = new LinkedHashMap<>();
        for (CartItemRequest guestItem : guestItems) {
            validateRequest(guestItem);
            long combinedQuantity = (long) quantitiesByProduct.getOrDefault(guestItem.getProductId(), 0)
                    + guestItem.getQuantity();
            if (combinedQuantity > Integer.MAX_VALUE) {
                throw new IllegalArgumentException("Requested quantity is too large");
            }
            quantitiesByProduct.put(guestItem.getProductId(), (int) combinedQuantity);
        }

        User user = lockUser(userId);
        Cart cart = cartRepository.findByUserId(userId).orElse(null);
        Map<Long, Product> products = new LinkedHashMap<>();
        for (Map.Entry<Long, Integer> entry : quantitiesByProduct.entrySet()) {
            Product product = findProduct(entry.getKey());
            int existingQuantity = cart == null ? 0 : cart.getItems().stream()
                    .filter(item -> entry.getKey().equals(item.getProduct().getId()))
                    .mapToInt(CartItem::getQuantity)
                    .sum();
            long resultingQuantity = (long) existingQuantity + entry.getValue();
            if (resultingQuantity > Integer.MAX_VALUE) {
                throw new IllegalArgumentException("Requested quantity is too large");
            }
            validateAvailableStock(product, (int) resultingQuantity);
            products.put(entry.getKey(), product);
        }

        if (cart == null) {
            cart = createCart(user);
        }
        for (Map.Entry<Long, Integer> entry : quantitiesByProduct.entrySet()) {
            addProduct(cart, products.get(entry.getKey()), entry.getValue());
        }
        return toCartResponse(cartRepository.save(cart));
    }

    private void validateRequest(CartItemRequest request) {
        if (request == null || request.getProductId() == null) {
            throw new IllegalArgumentException("productId is required");
        }
        if (request.getQuantity() <= 0) {
            throw new IllegalArgumentException("quantity must be greater than zero");
        }
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
    }

    private User lockUser(Long userId) {
        return userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    private Cart createCart(User user) {
        Cart cart = new Cart();
        cart.setUser(user);
        return cartRepository.save(cart);
    }

    private void addProduct(Cart cart, Product product, int quantity) {
        CartItem item = cart.getItems().stream()
                .filter(cartItem -> product.getId().equals(cartItem.getProduct().getId()))
                .findFirst()
                .orElse(null);
        long resultingQuantity = (long) (item == null ? 0 : item.getQuantity()) + quantity;
        if (resultingQuantity > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Requested quantity is too large");
        }
        validateAvailableStock(product, (int) resultingQuantity);

        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            item.setShopId(product.getShopIdJson());
            item.setQuantity(quantity);
            item.setPrice(product.getPrice());
            cart.getItems().add(item);
        } else {
            item.setQuantity((int) resultingQuantity);
            item.setPrice(product.getPrice());
        }
        touch(cart);
    }

    private void validateAvailableStock(Product product, int quantity) {
        if (quantity > product.getStockQuantity()) {
            throw new IllegalArgumentException(product.getStockQuantity() == 0
                    ? product.getName() + " is currently out of stock"
                    : "Only " + product.getStockQuantity() + " units of " + product.getName() + " are available");
        }
    }

    private void touch(Cart cart) {
        cart.setUpdatedAt(java.time.LocalDateTime.now());
    }

    // ----------------------------------------------------------------
    // Internal: map Cart entity → CartResponse DTO
    // ----------------------------------------------------------------
    private CartResponse toCartResponse(Cart cart) {
        List<CartItemDTO> dtos = new ArrayList<>();
        int totalItems = 0;
        double subtotal = 0;

        for (CartItem ci : cart.getItems()) {
            CartItemDTO dto = new CartItemDTO();
            dto.setId(ci.getId());
            dto.setProductId(ci.getProduct().getId());
            dto.setName(ci.getProduct().getName());
            dto.setDescription(ci.getProduct().getDescription());
            dto.setImageUrl(ci.getProduct().getImageUrl());
            dto.setShopId(ci.getShopId());
            dto.setShopName(ci.getProduct().getShopName());  // @Transient helper on Product
            dto.setQuantity(ci.getQuantity());
            dto.setPrice(ci.getProduct().getPrice());
            dto.setAvailableStock(ci.getProduct().getStockQuantity());
            dto.setPriceChanged(Double.compare(ci.getPrice(), ci.getProduct().getPrice()) != 0);
            dto.setLineTotal(roundCurrency(ci.getProduct().getPrice() * ci.getQuantity()));

            dtos.add(dto);
            totalItems += ci.getQuantity();
            subtotal += dto.getLineTotal();
        }

        CartResponse response = new CartResponse();
        response.setCartId(cart.getId());
        response.setItems(dtos);
        response.setTotalItems(totalItems);
        response.setSubtotal(roundCurrency(subtotal));
        return response;
    }

    private double roundCurrency(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    private CartResponse emptyCartResponse() {
        CartResponse r = new CartResponse();
        r.setItems(List.of());
        r.setTotalItems(0);
        r.setSubtotal(0);
        return r;
    }
}
