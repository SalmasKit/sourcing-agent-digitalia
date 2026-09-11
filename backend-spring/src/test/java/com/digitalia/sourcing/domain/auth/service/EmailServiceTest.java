package com.digitalia.sourcing.domain.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "noreply@digitalia.ma");
        ReflectionTestUtils.setField(emailService, "fromName", "Targetalent Sourcing");
    }

    @Test
    void sendTeamInvitation_shouldConstructAndSendMimeMessage() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() -> emailService.sendTeamInvitation(
                "recruiter@example.com",
                "Salma Admin",
                "http://localhost:5173/?invite=tok-123",
                "RECRUITER",
                "shortlist_candidates,source_candidates,create_roles,manage_notes,export_data,other_priv"
        ));

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendTeamInvitation_withNullInviterAndPrivileges_shouldHandleGracefully() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() -> emailService.sendTeamInvitation(
                "recruiter@example.com",
                null,
                "http://localhost:5173/?invite=tok-123",
                null,
                null
        ));

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendTeamInvitation_whenMailSenderThrows_shouldCatchAndNotRethrow() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new RuntimeException("Mail server unavailable")).when(mailSender).send(any(MimeMessage.class));

        assertDoesNotThrow(() -> emailService.sendTeamInvitation(
                "recruiter@example.com",
                "Admin",
                "http://localhost:5173/?invite=tok-123",
                "RECRUITER",
                "shortlist_candidates"
        ));
    }

    @Test
    void sendPasswordReset_shouldConstructAndSendMimeMessage() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() -> emailService.sendPasswordReset(
                "user@example.com",
                "http://localhost:5173/?resetToken=tok-xyz"
        ));

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendPasswordReset_whenMailSenderThrows_shouldCatchAndNotRethrow() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new RuntimeException("SMTP connection failed")).when(mailSender).send(any(MimeMessage.class));

        assertDoesNotThrow(() -> emailService.sendPasswordReset(
                "user@example.com",
                "http://localhost:5173/?resetToken=tok-xyz"
        ));
    }
}
