package com.orioncart.backend.service;

import com.orioncart.backend.dto.CartItemRequest;
import com.orioncart.backend.dto.CartResponse;
import com.orioncart.backend.model.Cart;
import com.orioncart.backend.model.CartItem;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.CartRepository;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    private static final Long USER_ID = 7L;

    @Mock
    private CartRepository cartRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRepository productRepository;
    @InjectMocks
    private CartService cartService;

    private User user;
    private Cart cart;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(USER_ID);
        cart = new Cart();
        cart.setId(11L);
        cart.setUser(user);

        when(userRepository.findByIdForUpdate(USER_ID)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        lenient().when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void addItemUsesAuthoritativeProductPriceAndShop() {
        Product product = product(3L, "Coffee", 125.50, 4);
        CartItemRequest request = request(3L, 2, 0.01, 999L);
        when(productRepository.findById(3L)).thenReturn(Optional.of(product));

        CartResponse response = cartService.addItem(USER_ID, request);

        assertEquals(1, response.getItems().size());
        assertEquals(2, response.getTotalItems());
        assertEquals(251.00, response.getSubtotal());
        assertEquals(125.50, response.getItems().getFirst().getPrice());
        assertEquals(4, response.getItems().getFirst().getAvailableStock());
        assertEquals(31L, response.getItems().getFirst().getShopId());
        assertEquals(1, cart.getItems().size());
        assertEquals(125.50, cart.getItems().getFirst().getPrice());
        verify(userRepository).findByIdForUpdate(USER_ID);
    }

    @Test
    void addAndUpdateMergeQuantitiesAndRemoveFromTheReturnedCart() {
        Product product = product(3L, "Coffee", 10.00, 5);
        when(productRepository.findById(3L)).thenReturn(Optional.of(product));

        CartResponse afterFirstAdd = cartService.addItem(USER_ID, request(3L, 1, 10.00, null));
        CartResponse afterSecondAdd = cartService.addItem(USER_ID, request(3L, 1, 10.00, null));

        assertEquals(1, afterFirstAdd.getItems().size());
        assertEquals(2, afterSecondAdd.getItems().getFirst().getQuantity());
        assertEquals(20.00, afterSecondAdd.getSubtotal());

        CartResponse afterUpdate = cartService.updateQuantity(USER_ID, 3L, 4);
        assertEquals(4, afterUpdate.getTotalItems());
        assertEquals(40.00, afterUpdate.getSubtotal());

        CartResponse afterRemove = cartService.removeItem(USER_ID, 3L);
        assertTrue(afterRemove.getItems().isEmpty());
        assertEquals(0, afterRemove.getTotalItems());
        assertEquals(0.0, afterRemove.getSubtotal());
        assertTrue(cart.getItems().isEmpty());
    }

    @Test
    void addAndUpdateRejectQuantitiesAboveCurrentStock() {
        Product product = product(3L, "Coffee", 10.00, 2);
        when(productRepository.findById(3L)).thenReturn(Optional.of(product));

        IllegalArgumentException addError = assertThrows(
                IllegalArgumentException.class,
                () -> cartService.addItem(USER_ID, request(3L, 3, 10.00, null))
        );
        assertTrue(addError.getMessage().contains("Only 2 units"));
        assertTrue(cart.getItems().isEmpty());

        CartItem existing = cartItem(product, 1, 10.00);
        cart.getItems().add(existing);
        IllegalArgumentException updateError = assertThrows(
                IllegalArgumentException.class,
                () -> cartService.updateQuantity(USER_ID, 3L, 3)
        );
        assertTrue(updateError.getMessage().contains("Only 2 units"));
        assertEquals(1, existing.getQuantity());
    }

    @Test
    void mergeValidatesAllItemsBeforeChangingTheExistingCart() {
        Product available = product(3L, "Coffee", 10.00, 5);
        Product soldOut = product(4L, "Tea", 8.00, 0);
        when(productRepository.findById(3L)).thenReturn(Optional.of(available));
        when(productRepository.findById(4L)).thenReturn(Optional.of(soldOut));

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> cartService.mergeGuestCart(USER_ID, List.of(
                        request(3L, 1, 10.00, null),
                        request(4L, 1, 8.00, null)
                ))
        );

        assertTrue(error.getMessage().contains("out of stock"));
        assertTrue(cart.getItems().isEmpty());
    }

    @Test
    void getCartReportsLivePriceChangesAndClearRemovesPersistedItems() {
        Product product = product(3L, "Coffee", 12.00, 3);
        cart.getItems().add(cartItem(product, 1, 10.00));

        CartResponse response = cartService.getCart(USER_ID);

        assertEquals(12.00, response.getSubtotal());
        assertTrue(response.getItems().getFirst().isPriceChanged());

        cartService.clearCart(USER_ID);

        assertTrue(cart.getItems().isEmpty());
        assertFalse(cartService.getCart(USER_ID).getItems().stream().findAny().isPresent());
    }

    private Product product(Long id, String name, double price, int stock) {
        Shop shop = new Shop();
        shop.setId(31L);
        shop.setName("Neighborhood Market");

        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setPrice(price);
        product.setStockQuantity(stock);
        product.setShop(shop);
        return product;
    }

    private CartItemRequest request(Long productId, int quantity, double price, Long shopId) {
        CartItemRequest request = new CartItemRequest();
        request.setProductId(productId);
        request.setQuantity(quantity);
        request.setPrice(price);
        request.setShopId(shopId);
        return request;
    }

    private CartItem cartItem(Product product, int quantity, double savedPrice) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setShopId(product.getShopIdJson());
        item.setQuantity(quantity);
        item.setPrice(savedPrice);
        return item;
    }
}
