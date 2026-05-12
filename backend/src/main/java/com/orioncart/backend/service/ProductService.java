package com.orioncart.backend.service;

import com.orioncart.backend.dto.ProductBulkUploadError;
import com.orioncart.backend.dto.ProductBulkUploadResult;
import com.orioncart.backend.model.Shop;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.repository.ProductRepository;
import com.orioncart.backend.repository.ShopRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {
    private static final Logger log = LoggerFactory.getLogger(ProductService.class);
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 5;

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private NotificationService notificationService;

    public Product addProduct(Product product) {
        validateProduct(product.getName(), product.getPrice(), product.getStockQuantity());
        product.setShop(resolveShop(product));
        product.setCategory(trimToNull(product.getCategory()));
        product.setDescription(resolveDescription(product));
        product.setSku(normalizeSku(product.getSku()));
        product.setImageUrl(trimToNull(product.getImageUrl()));
        product.setLowStockThreshold(normalizeLowStockThreshold(product.getLowStockThreshold()));
        product.setLastStockUpdateAt(LocalDateTime.now());
        Product saved = productRepository.save(product);
        notificationService.notifyLowStockIfNeeded(saved, null);
        return saved;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public List<Product> getProductsByShop(Long shopId) {
        return productRepository.findByShopIdOrderByNameAsc(shopId);
    }

    public Product updateStock(Long productId, int quantity) {
        if (quantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock quantity cannot be negative");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        int previousStock = product.getStockQuantity();
        log.info("Updating stock for product id {} to {}", productId, quantity);
        product.setStockQuantity(quantity);
        product.setLastStockUpdateAt(LocalDateTime.now());
        Product saved = productRepository.save(product);
        notificationService.notifyLowStockIfNeeded(saved, previousStock);
        log.info("Stock updated for product id {}", saved.getId());
        return saved;
    }

    public Product updateProduct(Long productId, Product updated) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        validateProduct(updated.getName(), updated.getPrice(), updated.getStockQuantity());
        int previousStock = product.getStockQuantity();
        product.setName(updated.getName().trim());
        product.setCategory(trimToNull(updated.getCategory()));
        product.setDescription(resolveDescription(updated));
        product.setPrice(updated.getPrice());
        product.setStockQuantity(updated.getStockQuantity());
        product.setSku(normalizeSku(updated.getSku()));
        product.setImageUrl(trimToNull(updated.getImageUrl()));
        product.setLowStockThreshold(normalizeLowStockThreshold(updated.getLowStockThreshold()));
        if (updated.getShop() != null && updated.getShop().getId() != null) {
            product.setShop(resolveShop(updated));
        }
        if (previousStock != updated.getStockQuantity() || product.getLastStockUpdateAt() == null) {
            product.setLastStockUpdateAt(LocalDateTime.now());
        }
        Product saved = productRepository.save(product);
        notificationService.notifyLowStockIfNeeded(saved, previousStock);
        return saved;
    }

    public Product quickUpdateStock(Long productId, int quantity) {
        return updateStock(productId, quantity);
    }

    public ProductBulkUploadResult processBulkUpload(MultipartFile file, Long shopId) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file is required");
        }
        if (shopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop id is required");
        }
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        List<ProductBulkUploadError> errors = new ArrayList<>();
        int totalRows = 0;
        int successCount = 0;

        try (
                BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
                CSVParser parser = CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(true)
                        .setTrim(true)
                        .build()
                        .parse(reader)
        ) {
            for (CSVRecord record : parser) {
                totalRows += 1;
                int rowNumber = totalRows + 1;
                String sku = trimToNull(readCell(record, "SKU", "sku"));
                try {
                    String name = requireCell(record, "Product Name", "product_name", "name");
                    double price = parsePrice(requireCell(record, "Price", "price"));
                    int quantity = parseQuantity(requireCell(record, "Quantity", "quantity", "stock", "stock_qty", "stockQuantity"));
                    String category = trimToNull(readCell(record, "Category", "category"));
                    String description = trimToNull(readCell(record, "Description", "description"));
                    String imageUrl = trimToNull(readCell(record, "Image URL", "image_url", "imageUrl", "image"));
                    String thresholdCell = trimToNull(readCell(record, "Low Stock Threshold", "low_stock_threshold", "lowStockThreshold"));

                    Product product = findExistingProductForUpload(shopId, sku).orElseGet(Product::new);
                    Integer previousStock = product.getId() == null ? null : product.getStockQuantity();
                    product.setShop(shop);
                    product.setSku(sku);
                    product.setName(name.trim());
                    product.setCategory(category);
                    product.setDescription(description != null ? description : category);
                    product.setPrice(price);
                    product.setStockQuantity(quantity);
                    product.setLowStockThreshold(normalizeLowStockThreshold(parseOptionalInteger(thresholdCell)));
                    product.setImageUrl(imageUrl);
                    product.setLastStockUpdateAt(LocalDateTime.now());
                    Product saved = productRepository.save(product);
                    notificationService.notifyLowStockIfNeeded(saved, previousStock);
                    successCount += 1;
                } catch (IllegalArgumentException ex) {
                    errors.add(new ProductBulkUploadError(rowNumber, sku, ex.getMessage()));
                }
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read CSV file");
        }

        return new ProductBulkUploadResult(totalRows, successCount, errors.size(), errors);
    }

    public byte[] getCsvTemplate() {
        StringBuilder csv = new StringBuilder();
        csv.append("SKU,Product Name,Price,Quantity,Category,Low Stock Threshold,Image URL,Description\n");
        csv.append("GRC-1001,Amul Milk 1L,64,20,Dairy,5,https://example.com/amul-milk.jpg,Fresh toned milk\n");
        csv.append("GRC-1002,Ashirvaad Atta 5kg,289,12,Grocery,6,https://example.com/atta.jpg,Whole wheat flour\n");
        csv.append("MED-2001,Paracetamol 500mg,32,40,Pharmacy,10,,10 tablet strip\n");
        csv.append("ELC-3001,USB-C Cable 1m,199,15,Electronics,4,,Braided fast charging cable\n");
        csv.append("BKR-4001,Brown Bread,45,18,Bakery,5,,Fresh baked today\n");
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public void deleteProduct(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        productRepository.deleteById(productId);
    }

    private void validateProduct(String name, double price, int stockQuantity) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        }
        if (price < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price cannot be negative");
        }
        if (stockQuantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock quantity cannot be negative");
        }
    }

    private Shop resolveShop(Product product) {
        if (product.getShop() == null || product.getShop().getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop id is required");
        }
        Long shopId = product.getShop().getId();
        return shopRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
    }

    private Optional<Product> findExistingProductForUpload(Long shopId, String sku) {
        if (sku == null || sku.isBlank()) {
            return Optional.empty();
        }
        return productRepository.findByShopIdAndSkuIgnoreCase(shopId, sku);
    }

    private String resolveDescription(Product product) {
        String description = trimToNull(product.getDescription());
        if (description != null) {
            return description;
        }
        return trimToNull(product.getCategory());
    }

    private String normalizeSku(String sku) {
        String normalized = trimToNull(sku);
        return normalized == null ? null : normalized.toUpperCase();
    }

    private Integer normalizeLowStockThreshold(Integer lowStockThreshold) {
        if (lowStockThreshold == null || lowStockThreshold < 0) {
            return DEFAULT_LOW_STOCK_THRESHOLD;
        }
        return lowStockThreshold;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String readCell(CSVRecord record, String... headers) {
        for (String header : headers) {
            if (record.isMapped(header)) {
                String value = trimToNull(record.get(header));
                if (value != null) {
                    return value;
                }
            }
        }
        return null;
    }

    private String requireCell(CSVRecord record, String... headers) {
        String value = readCell(record, headers);
        if (value == null) {
            throw new IllegalArgumentException(headers[0] + " is required");
        }
        return value;
    }

    private double parsePrice(String value) {
        try {
            double price = Double.parseDouble(value);
            if (price < 0) {
                throw new IllegalArgumentException("Price cannot be negative");
            }
            return price;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Price is invalid");
        }
    }

    private int parseQuantity(String value) {
        try {
            int quantity = Integer.parseInt(value);
            if (quantity < 0) {
                throw new IllegalArgumentException("Quantity cannot be negative");
            }
            return quantity;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Quantity is invalid");
        }
    }

    private Integer parseOptionalInteger(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Low stock threshold is invalid");
        }
    }
}

