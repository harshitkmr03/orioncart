package com.orioncart.backend.mapper;

import com.orioncart.backend.dto.OrderDTO;
import com.orioncart.backend.dto.OrderItemDTO;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.OrderItem;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OrderMapper {

    public OrderDTO toDTO(Order order) {
        if (order == null) return null;
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setCustomerId(order.getCustomer() != null ? order.getCustomer().getId() : null);
        dto.setCreatedAt(order.getCreatedAt());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setSubtotalAmount(order.getSubtotalAmount());
        dto.setTaxAmount(order.getTaxAmount());
        dto.setDeliveryCharge(order.getDeliveryCharge());
        dto.setDiscountAmount(order.getDiscountAmount());
        dto.setFulfillmentType(order.getFulfillmentType() != null ? order.getFulfillmentType().name() : null);
        dto.setDeliveryAddress(order.getDeliveryAddress());
        dto.setDeliveryLatitude(order.getDeliveryLatitude());
        dto.setDeliveryLongitude(order.getDeliveryLongitude());
        dto.setScheduleTime(order.getScheduleTime());
        dto.setScheduledSlot(order.getScheduledSlot());
        dto.setContactName(order.getContactName());
        dto.setContactPhone(order.getContactPhone());
        dto.setDeliveryPartner(order.getDeliveryPartner());
        dto.setCouponCode(order.getCouponCode());
        dto.setLoyaltyPointsRedeemed(order.getLoyaltyPointsRedeemed());
        dto.setNote(order.getNote());
        dto.setStatus(order.getStatus() != null ? order.getStatus().name() : null);

        List<OrderItem> items = order.getItems();
        if (items == null) {
            dto.setItems(Collections.emptyList());
        } else {
            List<OrderItemDTO> itemDTOs = items.stream().map(this::toItemDTO).collect(Collectors.toList());
            dto.setItems(itemDTOs);
        }

        return dto;
    }

    private OrderItemDTO toItemDTO(OrderItem item) {
        if (item == null) return null;
        OrderItemDTO dto = new OrderItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct() != null ? item.getProduct().getId() : null);
        dto.setProductName(item.getProduct() != null ? item.getProduct().getName() : null);
        dto.setQuantity(item.getQuantity());
        dto.setPrice(item.getPrice());
        dto.setShopId(item.getShopId());
        return dto;
    }
}

