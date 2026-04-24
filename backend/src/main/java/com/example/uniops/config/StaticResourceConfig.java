package com.example.uniops.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private Path resolveUploadPath() {
        Path configuredPath = Paths.get(uploadDir);
        if (configuredPath.isAbsolute()) {
            return configuredPath.normalize();
        }

        Path cwdPath = configuredPath.toAbsolutePath().normalize();
        if (Files.exists(cwdPath)) {
            return cwdPath;
        }

        Path backendRelative = Paths.get("backend", uploadDir).toAbsolutePath().normalize();
        if (Files.exists(backendRelative)) {
            return backendRelative;
        }

        return cwdPath;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadsPath = resolveUploadPath();
        String uploadsLocation = uploadsPath.toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsLocation);
    }
}
