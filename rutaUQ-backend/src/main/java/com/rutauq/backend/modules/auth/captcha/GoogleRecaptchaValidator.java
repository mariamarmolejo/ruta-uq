package com.rutauq.backend.modules.auth.captcha;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.security.captcha.enabled", havingValue = "true")
public class GoogleRecaptchaValidator implements CaptchaValidator {

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RestTemplate restTemplate;
    private final String secretKey;

    public GoogleRecaptchaValidator(RestTemplate restTemplate,
                                    @Value("${app.security.captcha.secret-key}") String secretKey) {
        this.restTemplate = restTemplate;
        this.secretKey = secretKey;
    }

    @Override
    public boolean validate(String token) {
        if (!StringUtils.hasText(token)) {
            log.warn("reCAPTCHA token is blank");
            return false;
        }

        try {
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("secret", secretKey);
            params.add("response", token);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(VERIFY_URL, params, Map.class);

            Boolean success = response.getBody() != null
                    ? (Boolean) response.getBody().get("success")
                    : Boolean.FALSE;

            if (!Boolean.TRUE.equals(success)) {
                log.warn("reCAPTCHA verification failed: {}", response.getBody());
            }
            return Boolean.TRUE.equals(success);

        } catch (Exception e) {
            log.warn("reCAPTCHA verification request failed: {}", e.getMessage());
            return false;
        }
    }
}
