package com.example.uniops.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class FileUploadUtil {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /**
     * Save a multipart file under uploads/{subDir}/ and return the generated filename.
     */
    public String saveFile(String subDir, MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        String fileName = UUID.randomUUID() + extension;

        Path uploadPath = Paths.get(uploadDir, subDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return fileName;
    }

    /**
     * Delete a previously saved file.
     */
    public void deleteFile(String subDir, String fileName) {
        Path filePath = Paths.get(uploadDir, subDir, fileName);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
        }
    }
}