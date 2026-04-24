package com.example.uniops.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ResourceStatusSchemaMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ResourceStatusSchemaMigration.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            List<String> dataTypes = jdbcTemplate.query(
                    """
                    SELECT DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'resources'
                      AND COLUMN_NAME = 'status'
                    """,
                    (rs, rowNum) -> rs.getString("DATA_TYPE"));

            if (dataTypes.isEmpty()) {
                return;
            }

            String dataType = dataTypes.get(0);
            if ("enum".equalsIgnoreCase(dataType)) {
                jdbcTemplate.execute("ALTER TABLE resources MODIFY COLUMN status VARCHAR(50) NOT NULL");
                log.info("Migrated resources.status from ENUM to VARCHAR(50) for status compatibility.");
            }
        } catch (Exception ex) {
            log.warn("Skipping resources.status schema migration: {}", ex.getMessage());
        }
    }
}
