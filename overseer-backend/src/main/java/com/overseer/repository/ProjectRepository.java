package com.overseer.repository;

import com.overseer.model.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {

    List<Project> findByOwnerId(String ownerId);

    Optional<Project> findByOwnerUsernameAndSlug(String username, String slug);

    @Query("SELECT p FROM Project p WHERE p.visibility = 'PUBLIC' ORDER BY p.starCount DESC")
    Page<Project> findPublicProjects(Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.visibility = 'PUBLIC' " +
           "AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Project> searchPublicProjects(@Param("q") String query, Pageable pageable);

    @Query("SELECT p FROM Project p JOIN p.tags t WHERE p.visibility = 'PUBLIC' AND LOWER(t) = LOWER(:tag)")
    Page<Project> findPublicProjectsByTag(@Param("tag") String tag, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.visibility = 'PUBLIC' ORDER BY p.createdAt DESC")
    Page<Project> findRecentPublicProjects(Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.owner.id = :ownerId OR p.visibility = 'PUBLIC'")
    Page<Project> findAccessibleProjects(@Param("ownerId") String ownerId, Pageable pageable);
}
