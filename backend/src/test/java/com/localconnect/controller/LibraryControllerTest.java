package com.localconnect.controller;

import com.localconnect.domain.MasterProduct;
import com.localconnect.service.MasterProductService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.hasSize;

public class LibraryControllerTest {

    @Test
    void search_returnsResults() throws Exception {
        MasterProduct p = new MasterProduct();
        p.setName("Parle-G");
        MasterProductService svc = Mockito.mock(MasterProductService.class);
        when(svc.search(anyString())).thenReturn(List.of(p));

        LibraryController controller = new LibraryController(svc);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        mvc.perform(get("/api/library/search").param("q", "parle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }
}
