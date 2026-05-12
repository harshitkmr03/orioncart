package com.localconnect.service;

import com.localconnect.domain.MasterProduct;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class BulkUploadServiceTest {

    private MasterProductService masterProductService;
    private BulkUploadService bulkUploadService;

    @BeforeEach
    void setUp() {
        masterProductService = Mockito.mock(MasterProductService.class);
        bulkUploadService = new BulkUploadService(masterProductService);
    }

    @Test
    void processMasterProductCsv_parsesAndAdds() throws Exception {
        String csv = "name,brand,barcode\nParle-G,Parle,12345\n";
        MockMultipartFile file = new MockMultipartFile("file","products.csv","text/csv", csv.getBytes(StandardCharsets.UTF_8));
        when(masterProductService.add(Mockito.any(MasterProduct.class))).thenReturn(new MasterProduct());

        BulkUploadService.Result res = bulkUploadService.processMasterProductCsv(file);
        assertEquals(1, res.successCount);
        assertTrue(res.errors.isEmpty());
    }
}
