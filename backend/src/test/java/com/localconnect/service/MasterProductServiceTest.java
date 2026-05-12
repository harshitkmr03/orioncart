package com.localconnect.service;

import com.localconnect.domain.MasterProduct;
import com.localconnect.repository.MasterProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class MasterProductServiceTest {

    private MasterProductRepository repo;
    private MasterProductService service;

    @BeforeEach
    void setUp() {
        repo = Mockito.mock(MasterProductRepository.class);
        service = new MasterProductService(repo);
    }

    @Test
    void search_returnsAllOnEmptyQuery() {
        when(repo.findAll()).thenReturn(List.of());
        List<MasterProduct> out = service.search("");
        assertNotNull(out);
    }

    @Test
    void add_throwsOnDuplicateBarcode() {
        MasterProduct p = new MasterProduct();
        p.setBarcode("12345");
        when(repo.existsByBarcode(anyString())).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.add(p));
    }
}
