package com.overseer.config;

import com.overseer.model.Project;
import com.overseer.model.ProjectMember;
import com.overseer.model.ProjectMember.Role;
import com.overseer.model.Sheet;
import com.overseer.model.User;
import com.overseer.repository.ProjectMemberRepository;
import com.overseer.repository.ProjectRepository;
import com.overseer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Seed a realistic spread of demo data — designers, projects, forks, members,
 * follows, stars — so the app looks lived-in for screenshots, walkthroughs, and
 * the thesis defense. Opt-in via {@code OVERSEER_SEED_DEMO=true} (or the
 * {@code overseer.seed-demo} property) so it never runs on a real environment by
 * accident. Idempotent: skips if the demo cohort already exists.
 */
@Component
@RequiredArgsConstructor
@Order(10)
@Slf4j
public class DemoSeedRunner implements CommandLineRunner {

    private static final String SEED_MARKER_USERNAME = "demo_seed_marker";

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @Value("${overseer.seed-demo:false}")
    private boolean seedEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) return;
        if (userRepository.findByUsername(SEED_MARKER_USERNAME).isPresent()) {
            log.info("Demo data already seeded — skipping.");
            return;
        }

        Random rng = new Random(20260528L); // deterministic so screenshots stay stable
        List<User> users = seedUsers();
        log.info("Seeded {} demo users", users.size());

        seedFollows(users, rng);

        List<Project> projects = seedProjects(users, rng);
        log.info("Seeded {} demo projects", projects.size());

        seedMembersAndStars(projects, users, rng);

        // Marker user — its presence prevents re-seeding on subsequent boots.
        userRepository.save(User.builder()
            .username(SEED_MARKER_USERNAME)
            .email("demo+marker@overseer.local")
            .displayName("Demo Seed Marker")
            .bio("Internal marker — do not delete. Drop the row to allow re-seeding.")
            .provider(User.AuthProvider.GOOGLE)
            .providerId("demo-marker")
            .build());

        log.info("Demo seed complete.");
    }

    // ── Users ───────────────────────────────────────────────

    private record Seed(String username, String displayName, String email, String bio,
                        String location, String website, String[] skills) {}

    private static final Seed[] SEED_USERS = {
        new Seed("anna_kovalenko", "Anna Kovalenko", "anna@studio.local",
            "Brand & identity designer · ex-Apostrophe Studio. I like rough first drafts.",
            "Kyiv, UA", "https://annakovalenko.studio",
            new String[]{"Branding", "Typography", "Editorial"}),
        new Seed("mira_chen", "Mira Chen", "mira@parallel.studio",
            "Product designer at Parallel. Working on systems that designers actually want to use.",
            "Berlin, DE", "https://parallel.studio",
            new String[]{"Product Design", "Design Systems", "Figma"}),
        new Seed("jose_martin", "José Martín", "jose@labrava.co",
            "Type designer & lettering nerd. Currently obsessed with stencils.",
            "Madrid, ES", "https://labrava.co",
            new String[]{"Type Design", "Lettering", "Glyphs"}),
        new Seed("priya_raman", "Priya Raman", "priya@offshift.io",
            "UI/UX for fintech that doesn't feel like fintech.",
            "Bangalore, IN", "https://offshift.io",
            new String[]{"UI Design", "UX Research", "Mobile"}),
        new Seed("thomas_eriksson", "Thomas Eriksson", "thomas@boldhaus.se",
            "Motion designer. After Effects rigs and overcomplicated transitions.",
            "Stockholm, SE", "https://boldhaus.se",
            new String[]{"Motion", "Illustration", "Direction"}),
        new Seed("yui_takahashi", "Yui Takahashi", "yui@kasumi.studio",
            "Editorial design, books, and slow magazines.",
            "Tokyo, JP", "https://kasumi.studio",
            new String[]{"Editorial", "Print", "Typography"}),
        new Seed("oksana_lytvyn", "Oksana Lytvyn", "oksana@overseer.local",
            "Thesis advisor — collaborative tools for creative teams.",
            "Lviv, UA", null,
            new String[]{"Research", "Design Ops"}),
        new Seed("kai_wright", "Kai Wright", "kai@harbour.design",
            "Brand systems, indie magazines, occasional posters.",
            "Melbourne, AU", "https://harbour.design",
            new String[]{"Branding", "Print", "Illustration"}),
        new Seed("noor_amir", "Noor Amir", "noor@studio-amir.com",
            "Independent illustrator. Drawing for newspapers since 2019.",
            "Toronto, CA", "https://studio-amir.com",
            new String[]{"Illustration", "Editorial"}),
        new Seed("luca_bianchi", "Luca Bianchi", "luca@officinaplus.it",
            "Identity systems for cultural institutions. Long, patient projects.",
            "Milan, IT", null,
            new String[]{"Identity", "Wayfinding", "Print"}),
    };

    private List<User> seedUsers() {
        List<User> created = new ArrayList<>();
        int i = 0;
        for (Seed s : SEED_USERS) {
            User u = User.builder()
                .username(s.username())
                .email(s.email())
                .displayName(s.displayName())
                .bio(s.bio())
                .location(s.location())
                .websiteUrl(s.website())
                .skills(new HashSet<>(Arrays.asList(s.skills())))
                .provider(User.AuthProvider.GOOGLE)
                .providerId("demo-" + i)
                .build();
            created.add(userRepository.save(u));
            i++;
        }
        return created;
    }

    private void seedFollows(List<User> users, Random rng) {
        // Everyone follows 2–4 others, deterministic per seed.
        for (User follower : users) {
            Set<User> picks = new LinkedHashSet<>();
            int target = 2 + rng.nextInt(3);
            int safety = 0;
            while (picks.size() < target && safety++ < 20) {
                User candidate = users.get(rng.nextInt(users.size()));
                if (!candidate.getId().equals(follower.getId())) picks.add(candidate);
            }
            for (User target_ : picks) {
                target_.getFollowers().add(follower);
                userRepository.save(target_);
            }
        }
    }

    // ── Projects ────────────────────────────────────────────

    private record ProjectSeed(String ownerUsername, String name, String description,
                               String readme, Project.Visibility visibility, String[] tags,
                               String[] extraSheets) {}

    private static final ProjectSeed[] SEED_PROJECTS = {
        new ProjectSeed("anna_kovalenko", "Vyno Wine Bar — Identity",
            "Full visual identity for a natural-wine bar in Podil.",
            "# Vyno\n\nA quiet, dim, warm visual system. Built in three rounds with the founders.",
            Project.Visibility.PUBLIC,
            new String[]{"branding", "hospitality", "logo"},
            new String[]{"logo-explorations", "menu-print"}),
        new ProjectSeed("anna_kovalenko", "Stilo — Editorial Magazine",
            "Quarterly print magazine on Slavic folk pattern in modern fashion.",
            "# Stilo Issue 04\n\nGrid was tightened from 12 to 14 columns. Headlines now use Kazimir.",
            Project.Visibility.PUBLIC,
            new String[]{"editorial", "print", "magazine"},
            new String[]{"issue-04", "templates"}),
        new ProjectSeed("mira_chen", "Parallel Design System",
            "Component library and design tokens for the Parallel product suite.",
            "# Parallel DS\n\nFigma + Storybook source of truth. Tokens flow into both web and iOS.",
            Project.Visibility.PUBLIC,
            new String[]{"design-system", "tokens", "figma"},
            new String[]{"components", "tokens", "guidelines"}),
        new ProjectSeed("mira_chen", "Onboarding Flow Redesign",
            "Rebuilt the first-run onboarding for activation and accessibility.",
            "# Onboarding v3\n\nReduced steps 7 → 4. WCAG AA across all dark and light themes.",
            Project.Visibility.PRIVATE,
            new String[]{"product", "ux", "mobile"},
            new String[]{"v3-explorations"}),
        new ProjectSeed("jose_martin", "Vereda Display",
            "A high-contrast display serif drawn for poster work.",
            "# Vereda\n\nWeight axis from Regular to Black. Italic axis still in roughs.",
            Project.Visibility.PUBLIC,
            new String[]{"typeface", "display", "serif"},
            new String[]{"weights", "italics-wip"}),
        new ProjectSeed("priya_raman", "Offshift Mobile",
            "iOS + Android redesign of the Offshift payments app.",
            "# Offshift Mobile\n\nDark-mode first, with monochrome accent layers per region.",
            Project.Visibility.UNLISTED,
            new String[]{"mobile", "fintech", "ios"},
            new String[]{"ios", "android"}),
        new ProjectSeed("thomas_eriksson", "Vinter Title Sequence",
            "Opening title sequence for a Swedish drama.",
            "# Vinter\n\nThree-minute cold-open in 4K. AE rigs are gnarly.",
            Project.Visibility.PUBLIC,
            new String[]{"motion", "title-design", "tv"},
            new String[]{"shots", "renders"}),
        new ProjectSeed("yui_takahashi", "Kasumi Journal — Issue 02",
            "Slow-print quarterly. Issue 02 — \"On Patience.\"",
            "# Kasumi 02\n\nGrid stays. Cover paper changed to GA Files.",
            Project.Visibility.PUBLIC,
            new String[]{"editorial", "print", "magazine"},
            new String[]{"covers", "spreads"}),
        new ProjectSeed("kai_wright", "Harbour Sessions Poster Series",
            "Twelve gig posters for an indie venue in Fitzroy.",
            "# Harbour Sessions\n\nOne poster per month. Pulled silkscreen runs of 80.",
            Project.Visibility.PUBLIC,
            new String[]{"poster", "print", "music"},
            new String[]{"jan-mar", "apr-jun"}),
        new ProjectSeed("noor_amir", "Globe & Mail Op-Eds 2026",
            "Editorial spot illustrations.",
            "# Op-Eds\n\nMostly weekly. Brief + 2-hour turnaround on most.",
            Project.Visibility.PUBLIC,
            new String[]{"illustration", "editorial"},
            new String[]{"q1", "q2"}),
        new ProjectSeed("luca_bianchi", "Triennale Wayfinding",
            "Wayfinding refresh for Triennale Milano.",
            "# Triennale\n\nSignage uses TT Norms Pro at 26mm cap-height minimum.",
            Project.Visibility.PRIVATE,
            new String[]{"wayfinding", "identity", "print"},
            new String[]{"signage-mock", "icons"}),
    };

    private List<Project> seedProjects(List<User> users, Random rng) {
        List<Project> created = new ArrayList<>();
        for (ProjectSeed ps : SEED_PROJECTS) {
            User owner = userRepository.findByUsername(ps.ownerUsername()).orElse(null);
            if (owner == null) continue;

            Project project = Project.builder()
                .name(ps.name())
                .slug(slugify(ps.name()))
                .description(ps.description())
                .readmeContent(ps.readme())
                .visibility(ps.visibility())
                .tags(new HashSet<>(Arrays.asList(ps.tags())))
                .starCount(rng.nextInt(40))
                .viewCount(50 + rng.nextInt(2000))
                .owner(owner)
                .build();

            // main sheet (default) + extras
            Sheet main = Sheet.builder()
                .name("main").description("Default sheet").isDefault(true)
                .project(project).createdBy(owner).build();
            project.getSheets().add(main);

            for (String name : ps.extraSheets()) {
                project.getSheets().add(Sheet.builder()
                    .name(name).isDefault(false)
                    .project(project).createdBy(owner).build());
            }

            Project saved = projectRepository.save(project);

            // OWNER membership row to match MemberBackfillRunner's invariant.
            memberRepository.save(ProjectMember.builder()
                .project(saved).user(owner).role(Role.OWNER).build());

            created.add(saved);
        }
        return created;
    }

    private void seedMembersAndStars(List<Project> projects, List<User> users, Random rng) {
        Role[] collabRoles = { Role.EDITOR, Role.EDITOR, Role.VIEWER }; // 2/3 editors, 1/3 viewers

        for (Project project : projects) {
            // Add 1–3 collaborators (not the owner, no duplicates).
            int collaborators = 1 + rng.nextInt(3);
            Set<String> seen = new HashSet<>();
            seen.add(project.getOwner().getId());
            int safety = 0;
            while (seen.size() < collaborators + 1 && safety++ < 20) {
                User candidate = users.get(rng.nextInt(users.size()));
                if (!seen.add(candidate.getId())) continue;
                memberRepository.save(ProjectMember.builder()
                    .project(project)
                    .user(candidate)
                    .role(collabRoles[rng.nextInt(collabRoles.length)])
                    .build());
            }

            // Stars from a random subset (public + unlisted only — private stays private).
            if (project.getVisibility() != Project.Visibility.PRIVATE) {
                int starringUsers = rng.nextInt(users.size() / 2 + 1);
                Set<String> starredBy = new HashSet<>();
                for (int i = 0; i < starringUsers; i++) {
                    User u = users.get(rng.nextInt(users.size()));
                    if (u.getId().equals(project.getOwner().getId())) continue;
                    if (!starredBy.add(u.getId())) continue;
                    u.getStarredProjects().add(project);
                    userRepository.save(u);
                }
                project.setStarCount(starredBy.size() + project.getStarCount());
                projectRepository.save(project);
            }
        }
    }

    private String slugify(String name) {
        String s = name.toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        return s.isEmpty() ? "project" : s;
    }
}
