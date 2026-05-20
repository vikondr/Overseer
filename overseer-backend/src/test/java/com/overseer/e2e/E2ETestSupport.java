package com.overseer.e2e;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.context.SpringBootTest;

/**
 * Common Spring Boot test configuration for end-to-end tests.
 *
 * The inline {@code properties} block forces an in-memory H2 database and
 * deterministic test credentials regardless of any {@code SPRING_DATASOURCE_URL}
 * or {@code JWT_SECRET} environment variables leaking in from the developer's
 * shell — inline properties on {@code @SpringBootTest} take precedence over
 * OS env vars in Spring's property source order.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:overseer-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        // Match the dockerised production behaviour: OSIV is on, lazy proxies
        // remain initialisable while the controller serialises the response.
        // (The external application.properties at the backend root sets this
        //  to false but is only picked up under maven, not under docker.)
        "spring.jpa.open-in-view=true",
        "overseer.jwt.secret=test-secret-key-for-overseer-unit-and-e2e-tests-do-not-use-in-production",
        "overseer.jwt.expiration-ms=3600000",
        "spring.security.oauth2.client.registration.google.client-id=test-client-id",
        "spring.security.oauth2.client.registration.google.client-secret=test-client-secret",
        "logging.level.org.springframework.web=WARN",
        "logging.level.org.springframework.security=WARN",
        "logging.level.org.hibernate=WARN",
        "logging.level.com.overseer=INFO"
    }
)
public @interface E2ETestSupport {
}