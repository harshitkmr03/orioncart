package com.localconnect.backend.service;

import com.localconnect.backend.dto.NotificationDTO;
import com.localconnect.backend.model.Notification;
import com.localconnect.backend.model.Order;
import com.localconnect.backend.model.Product;
import com.localconnect.backend.model.Shop;
import com.localconnect.backend.model.User;
import com.localconnect.backend.repository.NotificationRepository;
import com.localconnect.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {
    public static final String TYPE_ORDER_PLACED = "ORDER_PLACED";
    public static final String TYPE_ORDER_STATUS = "ORDER_STATUS";
    public static final String TYPE_LOW_STOCK = "LOW_STOCK";
    public static final String TYPE_REVIEW_PROMPT = "REVIEW_PROMPT";
    public static final String TYPE_DISPUTE = "DISPUTE";

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public List<NotificationDTO> getNotifications(Long userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipient_IdAndReadAtIsNull(userId);
    }

    public NotificationDTO markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (notification.getRecipient() == null || !userId.equals(notification.getRecipient().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This notification does not belong to you");
        }
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
        return toDto(notification);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId);
        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;
        for (Notification notification : notifications) {
            if (notification.getReadAt() == null) {
                notification.setReadAt(now);
                changed = true;
            }
        }
        if (changed) {
            notificationRepository.saveAll(notifications);
        }
    }

    public void notifyOrderPlaced(Order order) {
        if (order == null || order.getId() == null) {
            return;
        }

        if (order.getCustomer() != null && order.getCustomer().getId() != null) {
            createNotification(
                    order.getCustomer().getId(),
                    TYPE_ORDER_PLACED,
                    "Order placed successfully",
                    "Your order #" + order.getId() + " has been placed and is now being processed.",
                    "/account"
            );
        }

        Set<Long> sellerIds = new LinkedHashSet<>();
        if (order.getItems() != null) {
            for (var item : order.getItems()) {
                Product product = item.getProduct();
                Shop shop = product != null ? product.getShop() : null;
                User owner = shop != null ? shop.getOwner() : null;
                if (owner != null && owner.getId() != null) {
                    sellerIds.add(owner.getId());
                }
            }
        }

        for (Long sellerId : sellerIds) {
            createNotification(
                    sellerId,
                    TYPE_ORDER_PLACED,
                    "New order received",
                    "A new order #" + order.getId() + " needs fulfillment from your shop.",
                    "/seller"
            );
        }
    }

    public void notifyOrderStatusChanged(Order order, Order.OrderStatus previousStatus) {
        if (order == null || order.getId() == null || order.getCustomer() == null || order.getCustomer().getId() == null) {
            return;
        }

        String previousLabel = previousStatus == null ? "created" : formatStatus(previousStatus.name());
        String currentLabel = order.getStatus() == null ? "updated" : formatStatus(order.getStatus().name());
        createNotification(
                order.getCustomer().getId(),
                TYPE_ORDER_STATUS,
                "Order #" + order.getId() + " updated",
                "Your order moved from " + previousLabel + " to " + currentLabel + ".",
                "/account"
        );

        if (order.getStatus() == Order.OrderStatus.COMPLETED) {
            createNotification(
                    order.getCustomer().getId(),
                    TYPE_REVIEW_PROMPT,
                    "Rate your recent order",
                    "Your order #" + order.getId() + " was completed. Leave a review and earn loyalty points.",
                    "/account"
            );
        }
    }

    public void notifyLowStockIfNeeded(Product product, Integer previousStock) {
        if (product == null || product.getShop() == null || product.getShop().getOwner() == null || product.getShop().getOwner().getId() == null) {
            return;
        }

        int threshold = product.getLowStockThreshold() == null ? 5 : product.getLowStockThreshold();
        boolean nowLow = product.getStockQuantity() <= threshold;
        boolean wasLow = previousStock != null && previousStock <= threshold;
        if (!nowLow || wasLow) {
            return;
        }

        createNotification(
                product.getShop().getOwner().getId(),
                TYPE_LOW_STOCK,
                "Low stock alert",
                "Product \"" + product.getName() + "\" is low on stock with " + product.getStockQuantity() + " units left.",
                "/seller"
        );
    }

    public void notifyDisputeCreated(Long sellerId, Long customerId, Long orderId) {
        if (customerId != null) {
            createNotification(
                    customerId,
                    TYPE_DISPUTE,
                    "Dispute submitted",
                    "Your dispute for order #" + orderId + " has been submitted for review.",
                    "/account"
            );
        }

        if (sellerId != null) {
            createNotification(
                    sellerId,
                    TYPE_DISPUTE,
                    "New dispute raised",
                    "A customer raised a dispute for order #" + orderId + ".",
                    "/seller"
            );
        }
    }

    public void createNotification(Long recipientId, String type, String title, String message, String link) {
        if (recipientId == null) {
            return;
        }

        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setLink(link);
        notification.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    private NotificationDTO toDto(Notification notification) {
        return new NotificationDTO(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getLink(),
                notification.getReadAt() != null,
                notification.getCreatedAt()
        );
    }

    private String formatStatus(String value) {
        return value.toLowerCase().replace('_', ' ');
    }
}
