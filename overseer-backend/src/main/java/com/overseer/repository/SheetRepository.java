package com.overseer.repository;

import com.overseer.model.Sheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SheetRepository extends JpaRepository<Sheet, String> {

    List<Sheet> findByProjectId(String projectId);

    Optional<Sheet> findByProjectIdAndName(String projectId, String name);

    Optional<Sheet> findByProjectIdAndIsDefaultTrue(String projectId);

    boolean existsByProjectIdAndName(String projectId, String name);
}
