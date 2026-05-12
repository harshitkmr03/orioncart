package com.localconnect.backend.config;

import com.localconnect.backend.model.User;
import com.localconnect.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * Clean single-file DataSeeder that seeds minimal sample data when the database
 * is empty.
 */
@Component
public class DataSeeder implements CommandLineRunner {

        private final Logger log = LoggerFactory.getLogger(DataSeeder.class);
        private final UserRepository userRepository;
        private final com.localconnect.backend.repository.ShopRepository shopRepository;
        private final com.localconnect.backend.repository.ProductRepository productRepository;

        public DataSeeder(UserRepository userRepository,
                        com.localconnect.backend.repository.ShopRepository shopRepository,
                        com.localconnect.backend.repository.ProductRepository productRepository) {
                this.userRepository = userRepository;
                this.shopRepository = shopRepository;
                this.productRepository = productRepository;
        }

        @Override
        @Transactional
        public void run(String... args) throws Exception {
                log.info("Ensuring sample users with valid credentials exist...");

                org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

                // Upsert seller
                User seller = userRepository.findByUsername("seller").orElseGet(() -> {
                        User u = new User();
                        u.setUsername("seller");
                        u.setRole(User.Role.SHOPKEEPER);
                        return u;
                });
                seller.setPassword(encoder.encode("password"));
                userRepository.save(seller);

                // Upsert buyer
                User buyer = userRepository.findByUsername("buyer").orElseGet(() -> {
                        User u = new User();
                        u.setUsername("buyer");
                        u.setRole(User.Role.CUSTOMER);
                        return u;
                });
                buyer.setPassword(encoder.encode("password"));
                userRepository.save(buyer);

                // Ensure at least one shop exists for demo purposes (backend model)
                if (shopRepository.count() == 0) {
                        log.info("Seeding shops and products near the user's default location (Indore)...");

                        // Shop 1: Grocery
                        com.localconnect.backend.model.Shop shop1 = new com.localconnect.backend.model.Shop();
                        shop1.setName("Sharma General Store");
                        shop1.setCategory("Grocery");
                        shop1.setLatitude(22.7196);
                        shop1.setLongitude(75.8577);
                        shopRepository.save(shop1);

                        com.localconnect.backend.model.Product p1 = new com.localconnect.backend.model.Product();
                        p1.setName("Milk 1L");
                        p1.setPrice(65.0);
                        p1.setStockQuantity(50);
                        p1.setShop(shop1);
                        productRepository.save(p1);

                        com.localconnect.backend.model.Product p2 = new com.localconnect.backend.model.Product();
                        p2.setName("Whole Wheat Bread");
                        p2.setPrice(40.0);
                        p2.setStockQuantity(20);
                        p2.setShop(shop1);
                        productRepository.save(p2);

                        // Shop 2: Pharmacy
                        com.localconnect.backend.model.Shop shop2 = new com.localconnect.backend.model.Shop();
                        shop2.setName("City Medico");
                        shop2.setCategory("Pharmacy");
                        shop2.setLatitude(22.7210); // Slightly north
                        shop2.setLongitude(75.8590); // Slightly east
                        shopRepository.save(shop2);

                        com.localconnect.backend.model.Product p3 = new com.localconnect.backend.model.Product();
                        p3.setName("Paracetamol 500mg");
                        p3.setPrice(20.0);
                        p3.setStockQuantity(100);
                        p3.setShop(shop2);
                        productRepository.save(p3);

                        com.localconnect.backend.model.Product p4 = new com.localconnect.backend.model.Product();
                        p4.setName("Cough Syrup 100ml");
                        p4.setPrice(120.0);
                        p4.setStockQuantity(15);
                        p4.setShop(shop2);
                        productRepository.save(p4);

                        // Shop 3: Bakery
                        com.localconnect.backend.model.Shop shop3 = new com.localconnect.backend.model.Shop();
                        shop3.setName("Fresh Bakes");
                        shop3.setCategory("Bakery");
                        shop3.setLatitude(22.7180); // Slightly south
                        shop3.setLongitude(75.8560); // Slightly west
                        shopRepository.save(shop3);

                        com.localconnect.backend.model.Product p5 = new com.localconnect.backend.model.Product();
                        p5.setName("Chocolate Cake 500g");
                        p5.setPrice(450.0);
                        p5.setStockQuantity(5);
                        p5.setShop(shop3);
                        productRepository.save(p5);

                        log.info("Seeded Shops and Products.");
                }

                // Make sure all UI categories have at least one shop for demo purposes
                seedMissingCategory(shopRepository, productRepository, "Dairy", "Amul Milk Parlour", 22.7160, 75.8550, "Fresh Milk 1L", 60.0, "Butter 500g", 250.0);
                seedMissingCategory(shopRepository, productRepository, "Fashion", "Trends Boutique", 22.7230, 75.8600, "Cotton T-Shirt", 499.0, "Denim Jeans", 1299.0);
                seedMissingCategory(shopRepository, productRepository, "Electronics", "Electro World", 22.7250, 75.8520, "Wireless Mouse", 599.0, "Bluetooth Earbuds", 1499.0);
                seedMissingCategory(shopRepository, productRepository, "General", "A to Z Store", 22.7140, 75.8590, "Notebook", 50.0, "Pen Set", 100.0);

                log.info("User & Shop seeding completed.");
        }

        private void seedMissingCategory(
                com.localconnect.backend.repository.ShopRepository shopRepo,
                com.localconnect.backend.repository.ProductRepository prodRepo,
                String category, String shopName, double lat, double lon,
                String p1Name, double p1Price, String p2Name, double p2Price) {

            // Check if any shop with this category exists
            boolean exists = shopRepo.findAll().stream()
                    .anyMatch(s -> category.equalsIgnoreCase(s.getCategory()));
            
            if (!exists) {
                log.info("Seeding missing category: {}", category);
                com.localconnect.backend.model.Shop shop = new com.localconnect.backend.model.Shop();
                shop.setName(shopName);
                shop.setCategory(category);
                shop.setLatitude(lat);
                shop.setLongitude(lon);
                shopRepo.save(shop);

                com.localconnect.backend.model.Product p1 = new com.localconnect.backend.model.Product();
                p1.setName(p1Name);
                p1.setPrice(p1Price);
                p1.setStockQuantity(50);
                p1.setShop(shop);
                prodRepo.save(p1);

                com.localconnect.backend.model.Product p2 = new com.localconnect.backend.model.Product();
                p2.setName(p2Name);
                p2.setPrice(p2Price);
                p2.setStockQuantity(20);
                p2.setShop(shop);
                prodRepo.save(p2);
            }
        }
}
