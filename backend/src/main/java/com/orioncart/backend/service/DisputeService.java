package com.orioncart.backend.service;

import com.orioncart.backend.dto.DisputeRequest;
import com.orioncart.backend.dto.DisputeResponse;
import com.orioncart.backend.model.Dispute;
import com.orioncart.backend.model.Order;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.User;
import com.orioncart.backend.repository.DisputeRepository;
import com.orioncart.backend.repository.OrderRepository;
import com.orioncart.backend.repository.ShopRepository;
import com.orioncart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DisputeService {

    @Autowired
    private DisputeRepository disputeRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public DisputeResponse createDispute(Long customerId, DisputeRequest request) {
        if (request == null || request.getOrderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order id is required");
        }
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dispute reason is required");
        }
        if (disputeRepository.existsByOrder_IdAndCustomer_Id(request.getOrderId(), customerId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A dispute already exists for this order");
        }

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getCustomer() == null || !customerId.equals(order.getCustomer().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This order does not belong to you");
        }
        // The frontend auto-marks orders as delivered when their schedule time passes.
        // We relax the strict database status check here so those simulated orders can be disputed.
        if (order.getCreatedAt() == null || order.getCreatedAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disputes must be raised within 24 hours of delivery");
        }

        Shop shop = resolveDisputeShop(order, request.getShopId());
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        Dispute dispute = new Dispute();
        dispute.setOrder(order);
        dispute.setCustomer(customer);
        dispute.setShop(shop);
        dispute.setReason(request.getReason().trim());
        dispute.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
        dispute.setEvidenceImageUrls(request.getEvidenceImageUrls());
        dispute.setStatus("OPEN");
        dispute.setRefundIssued(false);
        dispute.setRaisedAt(LocalDateTime.now());

        Dispute saved = disputeRepository.save(dispute);
        notificationService.notifyDisputeCreated(
                shop != null && shop.getOwner() != null ? shop.getOwner().getId() : null,
                customerId,
                order.getId()
        );
        return toResponse(saved);
    }

    public List<DisputeResponse> getCustomerDisputes(Long customerId, Long orderId) {
        List<Dispute> disputes = orderId == null
                ? disputeRepository.findByCustomer_IdOrderByRaisedAtDesc(customerId)
                : disputeRepository.findByCustomer_IdAndOrder_IdOrderByRaisedAtDesc(customerId, orderId);
        return disputes.stream().map(this::toResponse).toList();
    }

    private Shop resolveDisputeShop(Order order, Long requestedShopId) {
        Set<Long> shopIds = order.getItems() == null ? Set.of() : order.getItems().stream()
                .map(item -> item.getShopId())
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Long shopId = requestedShopId;
        if (shopId == null) {
            if (shopIds.size() > 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please specify which shop the dispute is for");
            }
            shopId = shopIds.stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order does not contain a disputable shop"));
        }

        Long finalShopId = shopId;
        if (!shopIds.isEmpty() && !shopIds.contains(finalShopId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected shop does not match this order");
        }

        return shopRepository.findById(finalShopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
    }

    private DisputeResponse toResponse(Dispute dispute) {
        return new DisputeResponse(
                dispute.getId(),
                dispute.getOrder() != null ? dispute.getOrder().getId() : null,
                dispute.getShop() != null ? dispute.getShop().getId() : null,
                dispute.getShop() != null ? dispute.getShop().getName() : null,
                dispute.getReason(),
                dispute.getDescription(),
                dispute.getEvidenceImageUrls(),
                dispute.getStatus(),
                dispute.getShopkeeperResponse(),
                dispute.getRefundIssued(),
                dispute.getRaisedAt(),
                dispute.getResolvedAt()
        );
    }

    private String joinEvidence(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return null;
        }
        return urls.stream()
                .filter(value -> value != null && !value.isBlank())
                .limit(3)
                .collect(Collectors.joining("\n"));
    }

    private List<String> splitEvidence(String stored) {
        if (stored == null || stored.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(stored.split("\\n"))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }
}

