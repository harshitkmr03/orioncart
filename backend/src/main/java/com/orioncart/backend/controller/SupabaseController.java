package com.orioncart.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supabase")
public class SupabaseController {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public SupabaseController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Read shops directly from Supabase `shop` table (schema provided).
     * Returns rows as a list of maps (column -> value).
     */
    @GetMapping("/shops")
    public ResponseEntity<List<Map<String, Object>>> getShops() {
        String sql = "SELECT id, name, address, latitude, longitude, shopkeeper_id FROM shop ORDER BY id LIMIT 1000";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(rows);
    }

    /**
     * Read products. If `shopId` provided, filter by product.shop_id; otherwise return recent products.
     */
    @GetMapping("/products")
    public ResponseEntity<List<Map<String, Object>>> getProducts(@RequestParam(required = false) Long shopId) {
        String sql;
        List<Map<String, Object>> rows;
        if (shopId != null) {
            sql = "SELECT id, name, price, description, features, category, image_url, stock_qty, shop_id FROM product WHERE shop_id = ? ORDER BY id";
            rows = jdbcTemplate.queryForList(sql, shopId);
        } else {
            sql = "SELECT id, name, price, description, features, category, image_url, stock_qty, shop_id FROM product ORDER BY id LIMIT 500";
            rows = jdbcTemplate.queryForList(sql);
        }
        return ResponseEntity.ok(rows);
    }

    /**
     * Read shop categories from `shop_categories` table.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<Map<String, Object>>> getShopCategories() {
        String sql = "SELECT shop_id, categories FROM shop_categories ORDER BY shop_id";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(rows);
    }

}

