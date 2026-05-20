package com.overseer.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link JwtUtil}. Constructs the component directly so the
 * suite has no Spring or DB dependency — the test is purely about token
 * generation and parsing.
 */
class JwtUtilTest {

    private static final String SECRET =
        "test-secret-key-for-overseer-unit-and-e2e-tests-do-not-use-in-production";

    private JwtUtil newUtil(long expirationMs) {
        return new JwtUtil(SECRET, expirationMs);
    }

    @Test
    @DisplayName("token round-trips: generated token validates and yields original user id")
    void generatedTokenRoundTrips() {
        JwtUtil util = newUtil(60_000);
        String token = util.generateToken("user-123", "user@example.com");

        assertThat(util.validateToken(token)).isTrue();
        assertThat(util.getUserIdFromToken(token)).isEqualTo("user-123");
    }

    @Test
    @DisplayName("expired token is rejected as invalid")
    void expiredTokenIsRejected() throws InterruptedException {
        JwtUtil util = newUtil(1); // expires effectively immediately
        String token = util.generateToken("user-123", "user@example.com");
        Thread.sleep(20);

        assertThat(util.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("token signed with a different secret cannot be validated")
    void tokenFromDifferentSecretIsRejected() {
        JwtUtil signer = newUtil(60_000);
        JwtUtil verifier = new JwtUtil(
            "an-entirely-different-secret-of-sufficient-length-for-hs256-signing",
            60_000
        );

        String token = signer.generateToken("user-123", "user@example.com");

        assertThat(verifier.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("malformed input is rejected without throwing")
    void malformedTokenIsRejected() {
        JwtUtil util = newUtil(60_000);
        assertThat(util.validateToken("not-a-jwt")).isFalse();
        assertThat(util.validateToken("")).isFalse();
    }
}