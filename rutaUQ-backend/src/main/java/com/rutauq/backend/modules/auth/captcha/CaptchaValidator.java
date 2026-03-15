package com.rutauq.backend.modules.auth.captcha;

/**
 * Abstraction for captcha validation.
 * Swap implementations via Spring profiles or properties
 * without changing any business logic.
 */
public interface CaptchaValidator {

    /**
     * Validates the captcha token provided by the client.
     *
     * @param token the captcha token from the request
     * @return true if valid, false otherwise
     */
    boolean validate(String token);
}
