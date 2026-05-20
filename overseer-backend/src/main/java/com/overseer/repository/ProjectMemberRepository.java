package com.overseer.repository;

import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, String> {

    Optional<ProjectMember> findByProjectIdAndUserId(String projectId, String userId);

    List<ProjectMember> findByProjectId(String projectId);

    List<ProjectMember> findByUserId(String userId);

    boolean existsByProjectIdAndUserId(String projectId, String userId);

    @Query("SELECT pm.project FROM ProjectMember pm WHERE pm.user.id = :userId")
    List<Project> findProjectsByUserId(@Param("userId") String userId);

    @Query("SELECT COUNT(pm) > 0 FROM ProjectMember pm " +
           "WHERE pm.project.id = :projectId AND pm.role = com.overseer.model.ProjectMember.Role.OWNER")
    boolean existsOwnerForProject(@Param("projectId") String projectId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ProjectMember pm WHERE pm.project.id = :projectId")
    int deleteByProjectId(@Param("projectId") String projectId);
}