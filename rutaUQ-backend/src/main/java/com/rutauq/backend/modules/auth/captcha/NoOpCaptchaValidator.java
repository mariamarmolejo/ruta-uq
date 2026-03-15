package com.rutauq.backend.modules.auth.captcha;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * No-operation captcha validator for development.
 * Always returns true — no external service needed.
 *
 * Activated when app.security.captcha.enabled=false (default in dev).
 * Replace with a real implementation (e.g., Google reCAPTCHA v3) in production.
 */
@Slf4j
@Component
@ConditionalOnProperty(
    name = "app.security.captcha.enabled",
    havingValue = "false",
    matchIfMissing = true
)
public class NoOpCaptchaValidator implements CaptchaValidator {

    @Override
    public boolean validate(String token) {
        log.debug("NoOpCaptchaValidator: captcha validation skipped (dev mode)");
        return true;
    }
}
