package com.digitalia.sourcing;

import com.digitalia.sourcing.config.JpaConfig;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base integration test class for the persistence layer.
 * Uses the Testcontainers "singleton container" pattern: the container is
 * started once via a static initializer and stays alive for the whole JVM
 * fork (all IT classes share it), avoiding the mismatch between Spring's
 * cached ApplicationContext and a container restarted per test class.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ImportAutoConfiguration(FlywayAutoConfiguration.class)
@Import(JpaConfig.class)
@ActiveProfiles("test")
@EnabledIf("isDockerAvailable")
public abstract class AbstractRepositoryIT {

    @ServiceConnection
    protected static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg16"))
                    .withDatabaseName("sourcing_test_db")
                    .withUsername("sourcing_user")
                    .withPassword("sourcing_password");

    static {
        if (isDockerAvailable()) {
            postgres.start();
        }
    }

    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }
}
