package com.overseer.e2e;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseer.config.JwtUtil;
import com.overseer.model.User;
import com.overseer.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end project lifecycle test: create → read → update → delete, all over
 * real HTTP, hitting the controller, service, JPA, and H2 layers. Pins down:
 *   - protected endpoints require a JWT,
 *   - create returns 201 with the persisted project body,
 *   - read by id (PUBLIC) is reachable without a token,
 *   - update by a non-member is rejected (403),
 *   - delete cleans up join tables and the project is gone (404 on re-fetch).
 *
 * The delete branch in particular covers the foreign-key bug we saw in May —
 * project_members and user_starred_projects must be wiped before the project row.
 */
@E2ETestSupport
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProjectLifecycleE2ETest {

    @LocalServerPort private int port;
    @Autowired private TestRestTemplate http;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserRepository userRepository;

    private final ObjectMapper json = new ObjectMapper();

    private String ownerToken;
    private String strangerToken;

    @BeforeEach
    void seedUsers() {
        // Swap in Apache HttpClient5 so PATCH requests work — the JDK's
        // HttpURLConnection rejects any method outside its hardcoded set.
        http.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());

        userRepository.deleteAll();

        User owner = userRepository.save(User.builder()
            .username("owner")
            .email("owner@example.com")
            .displayName("Owner")
            .provider(User.AuthProvider.GOOGLE)
            .providerId("p-owner")
            .build());
        User stranger = userRepository.save(User.builder()
            .username("stranger")
            .email("stranger@example.com")
            .displayName("Stranger")
            .provider(User.AuthProvider.GOOGLE)
            .providerId("p-stranger")
            .build());

        ownerToken = jwtUtil.generateToken(owner.getId(), owner.getEmail());
        strangerToken = jwtUtil.generateToken(stranger.getId(), stranger.getEmail());
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.set("Authorization", "Bearer " + token);
        return h;
    }

    @Test
    @DisplayName("full lifecycle: create → fetch → update → delete")
    void fullProjectLifecycle() throws Exception {
        // ── 1. Create as owner (PUBLIC so we can later fetch it anonymously) ─
        String createBody = """
            { "name": "Pixel Diff Demo",
              "description": "Thesis demo project",
              "visibility": "PUBLIC",
              "tags": ["UI Design"] }
            """;

        ResponseEntity<String> created = http.exchange(
            url("/api/projects"), HttpMethod.POST,
            new HttpEntity<>(createBody, authJson(ownerToken)), String.class);

        assertThat(created.getStatusCode())
            .as("create response body: %s", created.getBody())
            .isEqualTo(HttpStatus.CREATED);
        JsonNode body = json.readTree(created.getBody());
        String projectId = body.get("id").asText();
        assertThat(body.get("name").asText()).isEqualTo("Pixel Diff Demo");
        assertThat(body.get("slug").asText()).isEqualTo("pixel-diff-demo");
        assertThat(body.get("visibility").asText()).isEqualTo("PUBLIC");
        // A default "main" sheet must have been created with the project.
        // (Don't assert on the boolean field name — Jackson's mapping of
        //  Lombok's `isDefault` getter is finicky across versions.)
        assertThat(body.get("sheets").isArray()).isTrue();
        assertThat(body.get("sheets").size()).isEqualTo(1);
        assertThat(body.get("sheets").get(0).get("name").asText()).isEqualTo("main");

        // ── 2. Fetch by id without a token — public projects are readable ────
        ResponseEntity<String> fetched = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.GET,
            new HttpEntity<>(authJson(null)), String.class);
        assertThat(fetched.getStatusCode())
            .as("fetch response body: %s", fetched.getBody())
            .isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(fetched.getBody()).get("name").asText()).isEqualTo("Pixel Diff Demo");

        // ── 3. Update by a stranger is forbidden (403 from access service) ───
        ResponseEntity<String> forbidden = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.PATCH,
            new HttpEntity<>("{\"name\":\"Hijacked\"}", authJson(strangerToken)), String.class);
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // ── 4. Update by owner succeeds and refreshes the slug ──────────────
        ResponseEntity<String> updated = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.PATCH,
            new HttpEntity<>("{\"name\":\"Pixel Diff Demo v2\"}", authJson(ownerToken)),
            String.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(updated.getBody()).get("slug").asText())
            .isEqualTo("pixel-diff-demo-v2");

        // ── 5. Stranger starring is allowed (any authed user can star) ──────
        ResponseEntity<String> starred = http.exchange(
            url("/api/projects/" + projectId + "/star"), HttpMethod.POST,
            new HttpEntity<>("", authJson(strangerToken)), String.class);
        assertThat(starred.getStatusCode()).isEqualTo(HttpStatus.OK);

        // ── 6. Delete by stranger is forbidden ──────────────────────────────
        ResponseEntity<String> deleteForbidden = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.DELETE,
            new HttpEntity<>(authJson(strangerToken)), String.class);
        assertThat(deleteForbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // ── 7. Delete by owner succeeds even with a star and an owner member row ─
        //       (regression: project_members + user_starred_projects FKs)
        ResponseEntity<String> deleted = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.DELETE,
            new HttpEntity<>(authJson(ownerToken)), String.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // ── 8. Re-fetch after delete returns 404 ────────────────────────────
        ResponseEntity<String> afterDelete = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.GET,
            new HttpEntity<>(authJson(null)), String.class);
        assertThat(afterDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("private projects are not visible to strangers")
    void privateProjectIsHiddenFromStrangers() throws Exception {
        String createBody = """
            { "name": "Secret Sketches", "visibility": "PRIVATE" }
            """;
        ResponseEntity<String> created = http.exchange(
            url("/api/projects"), HttpMethod.POST,
            new HttpEntity<>(createBody, authJson(ownerToken)), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String projectId = json.readTree(created.getBody()).get("id").asText();

        // Stranger gets 403 (project exists, but they are not a member)
        ResponseEntity<String> strangerRead = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.GET,
            new HttpEntity<>(authJson(strangerToken)), String.class);
        assertThat(strangerRead.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // Anonymous also gets 403 — same reason
        ResponseEntity<String> anonRead = http.exchange(
            url("/api/projects/" + projectId), HttpMethod.GET,
            new HttpEntity<>(authJson(null)), String.class);
        assertThat(anonRead.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}