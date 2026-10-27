package com.orioncart.backend.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private org.springframework.core.env.Environment env;

    @Value("${spring.mail.username:${SPRING_MAIL_USERNAME:}}")
    private String configuredUsername;

    private String getSenderEmail() {
        if (env != null) {
            String u = env.getProperty("spring.mail.username");
            if (u != null && !u.isBlank() && u.contains("@")) return u.trim();
            u = env.getProperty("SPRING_MAIL_USERNAME");
            if (u != null && !u.isBlank() && u.contains("@")) return u.trim();
        }
        if (configuredUsername != null && !configuredUsername.isBlank() && configuredUsername.contains("@")) {
            return configuredUsername.trim();
        }
        return "noreply@orioncart.com";
    }

    /**
     * Sends password reset OTP to user's email address.
     * Falls back to secure logging if SMTP server is unconfigured or unreachable.
     */
    public boolean sendPasswordResetOtp(String toEmail, String otp, String recipientName) {
        String greeting = (recipientName != null && !recipientName.isBlank()) ? recipientName : "OrionCart User";
        String subject = "Your OrionCart Password Reset Verification Code";

        String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;\">"
                + "<h2 style=\"color: #4f46e5; margin-bottom: 16px;\">OrionCart Security</h2>"
                + "<p>Hello <strong>" + escapeHtml(greeting) + "</strong>,</p>"
                + "<p>We received a request to reset your OrionCart password. Use the verification code below to complete the reset process:</p>"
                + "<div style=\"background-color: #f3f4f6; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;\">"
                + "<span style=\"font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;\">" + otp + "</span>"
                + "</div>"
                + "<p style=\"color: #6b7280; font-size: 14px;\">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\" />"
                + "<p style=\"color: #9ca3af; font-size: 12px; text-align: center;\">OrionCart Hyperlocal Commerce Platform</p>"
                + "</div>";

        return dispatchEmail(toEmail, subject, htmlContent, "Password reset OTP", otp);
    }

    /**
     * Sends welcome confirmation email to newly registered user.
     */
    public boolean sendWelcomeEmail(String toEmail, String recipientName) {
        String greeting = (recipientName != null && !recipientName.isBlank()) ? recipientName : "OrionCart User";
        String subject = "Welcome to OrionCart! 🎉";

        String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;\">"
                + "<h2 style=\"color: #4f46e5; margin-bottom: 16px;\">Welcome to OrionCart! 🎉</h2>"
                + "<p>Hello <strong>" + escapeHtml(greeting) + "</strong>,</p>"
                + "<p>Thank you for joining OrionCart! Your account has been registered successfully.</p>"
                + "<p>You can now explore neighborhood shops, order express grocery & goods delivery, and earn loyalty points on every purchase.</p>"
                + "<div style=\"background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;\">"
                + "<p style=\"margin: 0; color: #111827; font-weight: 600;\">Start shopping locally and support your community.</p>"
                + "</div>"
                + "<hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\" />"
                + "<p style=\"color: #9ca3af; font-size: 12px; text-align: center;\">OrionCart Hyperlocal Commerce Platform</p>"
                + "</div>";

        return dispatchEmail(toEmail, subject, htmlContent, "Welcome notification", null);
    }

    private boolean dispatchEmail(String toEmail, String subject, String htmlContent, String purpose, String debugValue) {
        if (mailSender != null) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                String sender = getSenderEmail();
                helper.setFrom(new InternetAddress(sender, "OrionCart"));
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                mailSender.send(message);
                log.info("{} email sent successfully via SMTP to {}", purpose, toEmail);
                return true;
            } catch (Exception ex) {
                log.warn("Failed to dispatch {} via SMTP to {}: {}. Falling back to simulation log.", purpose, toEmail, ex.getMessage());
            }
        }

        // Development / offline simulation fallback
        log.info("================================================================================");
        if (debugValue != null) {
            log.info("[EMAIL SERVICE SIMULATION] {} for {}: {}", purpose, toEmail, debugValue);
        } else {
            log.info("[EMAIL SERVICE SIMULATION] {} for {}", purpose, toEmail);
        }
        log.info("================================================================================");
        return false;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
