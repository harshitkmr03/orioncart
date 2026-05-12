package com.orioncart.backend.controller;

import com.orioncart.backend.dto.NearbyProductSearchResult;
import com.orioncart.backend.dto.ProductBulkUploadResult;
import com.orioncart.backend.dto.QuickStockUpdateRequest;
import com.orioncart.backend.model.Product;
import com.orioncart.backend.service.DiscoveryService;
import com.orioncart.backend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {
    @Autowired
    private ProductService productService;

    @Autowired
    private DiscoveryService discoveryService;

    @PostMapping
    public Product addProduct(@RequestBody Product product) {
        return productService.addProduct(product);
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/shop/{shopId}")
    public List<Product> getProductsByShop(@PathVariable("shopId") Long shopId) {
        return productService.getProductsByShop(shopId);
    }

    @GetMapping("/search")
    public List<NearbyProductSearchResult> searchNearbyProducts(
            @RequestParam("q") String query,
            @RequestParam double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(required = false) String categories
    ) {
        return discoveryService.searchNearbyProducts(query, lat, resolveLongitude(lon, lng), radiusKm, categories);
    }

    @GetMapping("/csv-template")
    public ResponseEntity<byte[]> downloadCsvTemplate() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=orioncart-product-template.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(productService.getCsvTemplate());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable("id") Long id, @RequestBody Product product) {
        return ResponseEntity.ok(productService.updateProduct(id, product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductBulkUploadResult bulkUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("shopId") Long shopId
    ) {
        return productService.processBulkUpload(file, shopId);
    }

    @PutMapping("/{id}/stock")
    public Product updateStock(@PathVariable("id") Long id, @RequestParam int quantity) {
        return productService.updateStock(id, quantity);
    }

    @PutMapping("/{id}/quick-stock-update")
    public Product quickUpdateStock(@PathVariable("id") Long id, @RequestBody QuickStockUpdateRequest request) {
        if (request == null || request.quantity() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity is required");
        }
        return productService.quickUpdateStock(id, request.quantity());
    }

    private double resolveLongitude(Double lon, Double lng) {
        if (lon != null) {
            return lon;
        }
        if (lng != null) {
            return lng;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Longitude is required");
    }
}

