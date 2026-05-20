package com.overseer.e2e;

import com.overseer.config.JwtUtil;
import com.overseer.model.User;
import com.overseer.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end security tests. Boots the full Spring Boot context against an
 * in-memory H2 database and exercises the public/protected endpoint matrix
 * through real HTTP, going through {@code JwtAuthFilter}, {@code SecurityConfig},
 * and the global exception handler.
 */
@E2ETestSupport
class AuthSecurityE2ETest {

    @LocalServerPort private int port;
    @Autowired private TestRestTemplate http;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserRepository userRepository;

    private String validToken;

    @BeforeEach
    void seedUser() {
        // No @Transactional on the class — embedded Tomcat runs requests on a
        // separate thread and won't see uncommitted data. Clean up explicitly
        // between tests so the unique constraints on username/email don't trip.
        userRepository.deleteAll();
        User user = userRepository.save(User.builder()
            .username("vikondr")
            .email("v@example.com")
            .displayName("Viktoriia Kondratska")
            .provider(User.AuthProvider.GOOGLE)
            .providerId("test-provider-id")
            .build());
        validToken = jwtUtil.generateToken(user.getId(), user.getEmail());
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set("Authorization", "Bearer " + token);
        return h;
    }

    @Test
    @DisplayName("GET /api/projects/explore is publicly accessible (no JWT required)")
    void exploreIsPublic() {
        ResponseEntity<String> response = http.getForEntity(url("/api/projects/explore"), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /api/projects without JWT is rejected (redirected to OAuth login)")
    void createProjectRequiresAuth() {
        ResponseEntity<String> response = http.postForEntity(
            url("/api/projects"),
            new HttpEntity<>("{\"name\":\"X\"}", jsonHeaders()),
            String.class);

        // With oauth2Login enabled, an unauthenticated request to a protected
        // endpoint redirects to the OAuth login flow (302). Either way the
        // request is not served — the assertion below pins down "rejected".
        assertThat(response.getStatusCode().is3xxRedirection()
            || response.getStatusCode() == HttpStatus.UNAUTHORIZED)
            .as("expected 302 redirect or 401 but got %s", response.getStatusCode())
            .isTrue();
    }

    @Test
    @DisplayName("GET /api/auth/verify with a valid token returns 200")
    void verifyWithValidTokenReturnsOk() {
        ResponseEntity<String> response = http.exchange(
            url("/api/auth/verify"), HttpMethod.GET,
            new HttpEntity<>(bearer(validToken)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /api/auth/verify with a tampered token returns 401")
    void verifyWithTamperedTokenReturnsUnauthorized() {
        String tampered = validToken.substring(0, validToken.length() - 4) + "xxxx";
        ResponseEntity<String> response = http.exchange(
            url("/api/auth/verify"), HttpMethod.GET,
            new HttpEntity<>(bearer(tampered)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("GET /api/auth/me with a valid token returns the authenticated user")
    void getMeReturnsCurrentUser() {
        ResponseEntity<String> response = http.exchange(
            url("/api/auth/me"), HttpMethod.GET,
            new HttpEntity<>(bearer(validToken)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"username\":\"vikondr\"");
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.add("Content-Type", "application/json");
        return h;
    }
}