package com.digitalia.sourcing;

import org.springframework.boot.SpringApplication;

public class TestSourcingApplication {

	public static void main(String[] args) {
		SpringApplication.from(SourcingApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
