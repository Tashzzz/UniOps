package com.example.uniops.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long>, JpaSpecificationExecutor<Resource> {
    List<Resource> findByStatus(ResourceStatus status);
    List<Resource> findByType(ResourceType type);
    List<Resource> findByStatusAndType(ResourceStatus status, ResourceType type);
    List<Resource> findByNameContainingIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndLocationIgnoreCase(String name, String location);
    Optional<Resource> findByNameIgnoreCaseAndLocationIgnoreCase(String name, String location);
}