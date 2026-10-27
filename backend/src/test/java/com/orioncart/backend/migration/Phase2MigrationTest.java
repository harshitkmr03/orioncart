package com.orioncart.backend.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class Phase2MigrationTest {

    @Test
    void appliesCartAndLoyaltyMigrationsFromBaselineNineteen() throws SQLException {
        String databaseName = "phase2_migrations_" + UUID.randomUUID().toString().replace("-", "");
        String url = System.getProperty("phase2.test.jdbcUrl",
                "jdbc:h2:mem:" + databaseName + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        String username = System.getProperty("phase2.test.username", "sa");
        String password = System.getProperty("phase2.test.password", "");

        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE users (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE product (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE shop (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE loyalty_points (id BIGINT PRIMARY KEY, points_balance INT NOT NULL)");
            statement.execute("CREATE TABLE loyalty_transactions ("
                    + "id BIGINT PRIMARY KEY, user_id BIGINT, reference_id BIGINT, transaction_type VARCHAR(50))");

            Flyway.configure()
                    .dataSource(url, username, password)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .baselineVersion("19")
                    .target("21")
                    .load()
                    .migrate();

            statement.execute("INSERT INTO loyalty_points (id, points_balance) VALUES (1, 0)");
            assertThrows(SQLException.class, () ->
                    statement.execute("INSERT INTO loyalty_points (id, points_balance) VALUES (2, -1)"));

            statement.execute("INSERT INTO loyalty_transactions "
                    + "(id, user_id, reference_id, transaction_type) VALUES (100, 1, 7, 'REDEMPTION')");
            statement.execute("INSERT INTO loyalty_transactions "
                    + "(id, user_id, reference_id, transaction_type, is_reversal, reversed_tx_id) "
                    + "VALUES (101, 1, 7, 'REDEMPTION_REFUND', TRUE, 100)");
            assertThrows(SQLException.class, () ->
                    statement.execute("INSERT INTO loyalty_transactions "
                            + "(id, user_id, reference_id, transaction_type, is_reversal, reversed_tx_id) "
                            + "VALUES (102, 1, 7, 'REDEMPTION_REFUND', TRUE, 100)"));
        }
    }

    @Test
    void appliesPostgisMigrationOnPostgres() throws SQLException {
        String url = System.getProperty("phase2.test.jdbcUrl", "");
        org.junit.jupiter.api.Assumptions.assumeTrue(
                url.startsWith("jdbc:postgresql:"),
                "PostGIS migration test is only executed against a PostgreSQL datasource");

        String username = System.getProperty("phase2.test.username", "postgres");
        String password = System.getProperty("phase2.test.password", "postgres");

        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE IF NOT EXISTS product (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE IF NOT EXISTS shop (id BIGINT PRIMARY KEY, name VARCHAR(255), latitude DOUBLE PRECISION, longitude DOUBLE PRECISION)");
            statement.execute("CREATE TABLE IF NOT EXISTS loyalty_points (id BIGINT PRIMARY KEY, points_balance INT NOT NULL)");
            statement.execute("CREATE TABLE IF NOT EXISTS loyalty_transactions ("
                    + "id BIGINT PRIMARY KEY, user_id BIGINT, reference_id BIGINT, transaction_type VARCHAR(50))");

            Flyway.configure()
                    .dataSource(url, username, password)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .baselineVersion("19")
                    .target("22")
                    .load()
                    .migrate();

            statement.execute("INSERT INTO shop (id, name, latitude, longitude) VALUES (999, 'PostGIS Shop', 22.7196, 75.8577)");
            try (java.sql.ResultSet rs = statement.executeQuery(
                    "SELECT id, name FROM shop WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(75.8577, 22.7196), 4326)::geography, 1000)")) {
                org.junit.jupiter.api.Assertions.assertTrue(rs.next(), "PostGIS ST_DWithin should match inserted shop");
                assertEquals(999L, rs.getLong("id"));
            }
        }
    }
}
