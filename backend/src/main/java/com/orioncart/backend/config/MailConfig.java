package com.orioncart.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Autowired
    private Environment env;

    @Bean
    public JavaMailSender javaMailSender() {
        String host = getProp("spring.mail.host", "SPRING_MAIL_HOST", "smtp.gmail.com");
        String portStr = getProp("spring.mail.port", "SPRING_MAIL_PORT", "587");
        int port = 587;
        try {
            port = Integer.parseInt(portStr);
        } catch (Exception ignored) {}

        String username = getProp("spring.mail.username", "SPRING_MAIL_USERNAME", null);
        String password = getProp("spring.mail.password", "SPRING_MAIL_PASSWORD", null);

        if (username != null) {
            username = username.trim();
        }
        if (password != null) {
            password = password.replace(" ", "").trim();
        }

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            log.warn("Email credentials not configured. EmailService will use simulation fallback.");
            return null;
        }

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);
        mailSender.setDefaultEncoding("UTF-8");

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");

        log.info("JavaMailSender initialized with host: {}:{}, username: {}", host, port, username);
        return mailSender;
    }

    private String getProp(String key1, String key2, String defaultVal) {
        String v1 = env.getProperty(key1);
        if (v1 != null && !v1.isBlank()) return v1.trim();
        String v2 = env.getProperty(key2);
        if (v2 != null && !v2.isBlank()) return v2.trim();
        return defaultVal;
    }
}
