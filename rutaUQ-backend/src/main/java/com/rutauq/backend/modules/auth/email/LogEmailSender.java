package com.rutauq.backend.modules.auth.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development / no-mail fallback.
 * Logs the email content to the console instead of sending it.
 * Active when app.mail.enabled=false (the default).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class LogEmailSender implements EmailSender {

    @Override
    public void send(String to, String subject, String body) {
        log.info("""
                ========== [DEV EMAIL] ==========
                To:      {}
                Subject: {}
                ---
                {}
                =================================
                """, to, subject, body);
    }
}
