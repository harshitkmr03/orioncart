package com.localconnect.controller;

import com.localconnect.domain.MasterProduct;
import com.localconnect.service.MasterProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.localconnect.service.BulkUploadService;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/library")
public class LibraryController {

    private final MasterProductService service;
    private final BulkUploadService bulkUploadService;

    public LibraryController(MasterProductService service) {
        this.service = service;
        this.bulkUploadService = null;
    }

    // Constructor used by Spring will be auto-wired; add alternate constructor for
    // bulk service
    public LibraryController(MasterProductService service, BulkUploadService bulkUploadService) {
        this.service = service;
        this.bulkUploadService = bulkUploadService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<MasterProduct>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping("/add")
    public ResponseEntity<MasterProduct> add(@RequestBody MasterProduct p) {
        MasterProduct saved = service.add(p);
        return ResponseEntity.created(URI.create("/api/library/" + saved.getId())).body(saved);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkUpload(@RequestParam("file") MultipartFile file) {
        if (bulkUploadService == null) {
            return ResponseEntity.status(500).body(Map.of("error", "Bulk upload service not configured"));
        }
        BulkUploadService.Result res = bulkUploadService.processMasterProductCsv(file);
        return ResponseEntity.ok(Map.of("successCount", res.successCount, "errors", res.errors));
    }
}
