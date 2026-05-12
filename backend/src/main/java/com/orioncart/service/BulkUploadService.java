package com.orioncart.service;

import com.orioncart.domain.MasterProduct;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class BulkUploadService {

    private final MasterProductService masterProductService;

    public BulkUploadService(MasterProductService masterProductService) {
        this.masterProductService = masterProductService;
    }

    public static class Result {
        public int successCount = 0;
        public List<String> errors = new ArrayList<>();
    }

    public Result processMasterProductCsv(MultipartFile file) {
        Result result = new Result();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            CSVParser parser = CSVFormat.DEFAULT
                    .withFirstRecordAsHeader()
                    .withIgnoreEmptyLines()
                    .parse(reader);

            for (CSVRecord rec : parser) {
                try {
                    String name = rec.get("name").trim();
                    String brand = rec.isMapped("brand") ? rec.get("brand").trim() : null;
                    String barcode = rec.isMapped("barcode") ? rec.get("barcode").trim() : null;

                    if (name == null || name.isBlank()) {
                        result.errors.add("Missing name at line " + rec.getRecordNumber());
                        continue;
                    }

                    MasterProduct p = new MasterProduct();
                    p.setName(name);
                    p.setBrand(brand);
                    p.setBarcode((barcode==null||barcode.isBlank())?null:barcode);

                    masterProductService.add(p);
                    result.successCount++;
                } catch (Exception e) {
                    result.errors.add("Line " + rec.getRecordNumber() + ": " + e.getMessage());
                }
            }

        } catch (Exception e) {
            result.errors.add("Failed to parse file: " + e.getMessage());
        }
        return result;
    }
}

