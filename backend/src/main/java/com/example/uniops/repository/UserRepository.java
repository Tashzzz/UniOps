package com.example.uniops.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.uniops.model.user;

@Repository
public interface UserRepository extends JpaRepository<user, Long> {
    Optional<user> findByEmail(String email);
    Optional<user> findByProviderAndProviderId(String provider, String providerId);
    boolean existsByEmail(String email);
}