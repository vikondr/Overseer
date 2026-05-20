package com.overseer.config;

import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.repository.ProjectMemberRepository;
import com.overseer.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-shot startup migration: every existing project must have a matching
 * ProjectMember row with role OWNER for its {@code Project.owner}. Without this
 * pass, projects created before role-based collaboration was introduced have no
 * member rows and would fail every role check.
 *
 * Idempotent: skips projects that already have an OWNER membership.
 */
@Component
@RequiredArgsConstructor
@Order(0)
@Slf4j
public class MemberBackfillRunner implements CommandLineRunner {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        for (Project project : projectRepository.findAll()) {
            if (memberRepository.existsOwnerForProject(project.getId())) continue;
            if (project.getOwner() == null) continue;
            memberRepository.save(ProjectMember.builder()
                .project(project)
                .user(project.getOwner())
                .role(Role.OWNER)
                .build());
            created++;
        }
        if (created > 0) {
            log.info("Backfilled OWNER membership for {} legacy project(s)", created);
        }
    }
}
