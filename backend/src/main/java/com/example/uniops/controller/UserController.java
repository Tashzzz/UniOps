package com.example.uniops.controller;


import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.uniops.model.User;
import com.example.uniops.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserRepository userRepository;

    // Simple login: match by email (no password needed for student project)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "No account found with that email"));
        }

        return ResponseEntity.ok(userOpt.get());
    }

    // Login with email + name (auto-register if not found)
    @PostMapping("/login-or-register")
    public ResponseEntity<?> loginOrRegister(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name  = body.get("name");
        String role  = body.get("role");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        String normalizedEmail = email.trim().toLowerCase();
        User.Role requestedRole = parseRole(role);

        User userEntity = userRepository.findByEmail(normalizedEmail)
            .map(existing -> {
                if (requestedRole != null && existing.getRole() != requestedRole) {
                    existing.setRole(requestedRole);
                    return userRepository.save(existing);
                }
                return existing;
            })
            .orElseGet(() -> {
                User newUser = User.builder()
                    .email(normalizedEmail)
                    .name(name != null ? name : normalizedEmail.split("@")[0])
                    .role(requestedRole != null ? requestedRole : User.Role.STUDENT)
                    .provider("local")
                    .providerId("local-" + System.currentTimeMillis())
                    .build();
                return userRepository.save(newUser);
            });

        return ResponseEntity.ok(userEntity);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    private User.Role parseRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        try {
            return User.Role.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}