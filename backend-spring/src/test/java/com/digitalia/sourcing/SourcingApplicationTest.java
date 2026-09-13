package com.digitalia.sourcing;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SourcingApplicationTest {

    @Test
    void testSourcingApplicationInstantiation() {
        SourcingApplication app = new SourcingApplication();
        assertNotNull(app);
    }
}