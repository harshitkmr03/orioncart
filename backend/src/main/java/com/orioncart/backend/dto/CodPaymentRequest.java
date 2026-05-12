package com.orioncart.backend.dto;

import com.orioncart.backend.model.Order;

public class CodPaymentRequest {
    private Order order;
    private String contactNumber;

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }
}

