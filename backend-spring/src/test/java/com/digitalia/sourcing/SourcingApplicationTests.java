package com.digitalia.sourcing;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.DockerClientFactory;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@EnabledIf("isDockerAvailable")
class SourcingApplicationTests {

	static boolean isDockerAvailable() {
		try {
			return DockerClientFactory.instance().isDockerAvailable();
		} catch (Throwable t) {
			return false;
		}
	}

	@Test
	void contextLoads() {
	}

}
