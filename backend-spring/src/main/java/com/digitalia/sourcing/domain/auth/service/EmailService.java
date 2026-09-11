package com.digitalia.sourcing.domain.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@example.com}")
    private String fromEmail;

    @Value("${app.mail.from-name:Targetalent Sourcing}")
    private String fromName;

    @Async
    public void sendTeamInvitation(String toEmail, String inviterName, String inviteUrl, String role, String privileges) {
        log.info("Dispatching team invitation email to recipient {}", toEmail);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(fromEmail, fromName));
            helper.setTo(toEmail);
            helper.setSubject("You're invited to join " + (inviterName != null ? inviterName : "the team") + " on Targetalent Sourcing");

            String htmlContent = buildInvitationHtml(inviterName, inviteUrl, role, privileges);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Successfully sent team invitation email to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send team invitation email to {}: {}", toEmail, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error sending email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Async
    public void sendPasswordReset(String toEmail, String resetUrl) {
        log.info("Dispatching password reset email to recipient {}", toEmail);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(fromEmail, fromName));
            helper.setTo(toEmail);
            helper.setSubject("Reset your password — Targetalent Sourcing");

            String htmlContent = buildPasswordResetHtml(resetUrl);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Successfully sent password reset email to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error sending reset email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    private String buildInvitationHtml(String inviterName, String inviteUrl, String role, String privileges) {
        List<String> privList = privileges != null ? Arrays.asList(privileges.split(",")) : List.of();
        StringBuilder privListHtml = new StringBuilder();
        for (String priv : privList) {
            String readable = formatPrivilegeName(priv.trim());
            privListHtml.append("<li style=\"margin-bottom: 6px; color: #374151; font-size: 14px;\">")
                    .append("✓ ").append(readable)
                    .append("</li>");
        }

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Team Invitation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 40px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #E5E7EB;">
                      <!-- Brand Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0A7E96 0%%, #065F73 100%%); padding: 32px 40px; text-align: left;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                            <tr>
                              <td>
                                <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                                  ✦ Targetalent Sourcing Agent
                                </div>
                                <div style="font-size: 13px; color: #D1FAE5; margin-top: 4px; font-weight: 500;">
                                  Autonomous AI Talent Acquisition & Sourcing
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 40px 24px 40px;">
                          <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                            You have been invited to collaborate!
                          </h1>
                          <p style="font-size: 15px; line-height: 24px; color: #4B5563; margin: 0 0 20px 0;">
                            <strong>%s</strong> has invited you to join their hiring workspace on <strong>Targetalent Sourcing</strong> as a <strong>%s</strong>.
                          </p>
                          
                          <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                            <div style="font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                              Assigned Workspace Privileges:
                            </div>
                            <ul style="margin: 0; padding-left: 4px; list-style-type: none;">
                              %s
                            </ul>
                          </div>

                          <!-- Call to Action Button -->
                          <div style="text-align: center; margin: 32px 0 24px 0;">
                            <a href="%s" target="_blank" style="background-color: #0A7E96; color: #FFFFFF; display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 6px rgba(10, 126, 150, 0.25);">
                              Accept Invitation & Set Up Account &rarr;
                            </a>
                          </div>

                          <p style="font-size: 13px; color: #6B7280; line-height: 20px; margin: 0 0 12px 0; text-align: center;">
                            This invitation is valid for <strong>7 days</strong>.
                          </p>
                          
                          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;" />
                          
                          <p style="font-size: 12px; color: #9CA3AF; line-height: 18px; margin: 0;">
                            If the button above does not work, copy and paste this link into your browser:<br />
                            <a href="%s" style="color: #0A7E96; word-break: break-all;">%s</a>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #F9FAFB; padding: 20px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
                          <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                            &copy; 2026 Targetalent Inc. All rights reserved. &bull; Secure AI Sourcing Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                inviterName != null ? inviterName : "An administrator",
                role != null ? role : "Recruiter",
                privListHtml.toString(),
                inviteUrl,
                inviteUrl,
                inviteUrl
        );
    }

    private String buildPasswordResetHtml(String resetUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Reset Password</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                <tr>
                  <td align="center" style="padding: 40px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
                      <tr>
                        <td style="background: #0A7E96; padding: 28px 40px; text-align: left; color: #FFF;">
                          <div style="font-size: 20px; font-weight: 700;">Targetalent Sourcing</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px 40px;">
                          <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Reset Your Password</h2>
                          <p style="color: #4B5563; font-size: 14px; line-height: 22px;">
                            We received a request to reset your password. Click the button below to choose a new password:
                          </p>
                          <div style="text-align: center; margin: 28px 0;">
                            <a href="%s" target="_blank" style="background-color: #0A7E96; color: #FFFFFF; display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                              Reset Password
                            </a>
                          </div>
                          <p style="font-size: 12px; color: #6B7280;">This password reset link expires in 2 hours. If you did not make this request, please ignore this email.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(resetUrl);
    }

    private String formatPrivilegeName(String key) {
        return switch (key) {
            case "create_roles" -> "Create & Edit Technical Roles";
            case "shortlist_candidates" -> "Shortlist & Pipeline Management";
            case "manage_notes" -> "Recruiter Screening & Notes";
            case "source_candidates" -> "AI Autonomous Web Sourcing";
            case "export_data" -> "Candidate Outreach & Data Export";
            default -> key.replace('_', ' ');
        };
    }
}
