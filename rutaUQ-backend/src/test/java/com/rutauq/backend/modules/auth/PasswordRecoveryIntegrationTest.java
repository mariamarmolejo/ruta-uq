package com.rutauq.backend.modules.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rutauq.backend.modules.auth.domain.TokenType;
import com.rutauq.backend.modules.auth.repository.EmailTokenRepository;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — Password recovery flow (BF-03).
 *
 * Covers:
 *  - POST /auth/forgot-password → creates token in DB, returns 200
 *  - POST /auth/reset-password  → updates password, token marked as used
 *  - Login with new password succeeds; old password is rejected
 *  - Invalid/reused tokens are rejected
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("BF-03 — Password Recovery Integration Tests")
class PasswordRecoveryIntegrationTest {

    @Autowired private MockMvc               mockMvc;
    @Autowired private ObjectMapper          objectMapper;
    @Autowired private UserRepository        userRepository;
    @Autowired private EmailTokenRepository  emailTokenRepository;

    private static final String EMAIL       = "test.recovery@rutauq.test";
    private static final String OLD_PASS    = "OldPass123!";
    private static final String NEW_PASS    = "NewPass456!";

    private String resetToken;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        // Clean any leftover test data
        userRepository.findByEmail(EMAIL).ifPresent(u -> {
            emailTokenRepository.deleteByUserIdAndType(u.getId(), TokenType.PASSWORD_RESET);
            emailTokenRepository.deleteByUserIdAndType(u.getId(), TokenType.VERIFICATION);
            userRepository.delete(u);
        });

        // Register and verify user
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Test",
                                "lastName",  "Recovery",
                                "email",     EMAIL,
                                "password",  OLD_PASS,
                                "role",      "CLIENT"
                        ))))
                .andExpect(status().isCreated());

        userRepository.findByEmail(EMAIL).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });
    }

    @AfterAll
    void cleanup() {
        userRepository.findByEmail(EMAIL).ifPresent(u -> {
            emailTokenRepository.deleteByUserIdAndType(u.getId(), TokenType.PASSWORD_RESET);
            emailTokenRepository.deleteByUserIdAndType(u.getId(), TokenType.VERIFICATION);
            userRepository.delete(u);
        });
    }

    // =========================================================================
    // BF-03  Password recovery
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("BF-03 — POST /auth/forgot-password with registered email → 200")
    void forgotPassword_registeredEmail_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(2)
    @DisplayName("BF-03 — forgot-password with unknown email → 200 (silent, no user enumeration)")
    void forgotPassword_unknownEmail_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "nobody@rutauq.test"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(3)
    @DisplayName("BF-03 — Password reset token is persisted in the database")
    void forgotPassword_tokenCreatedInDatabase() {
        userRepository.findByEmail(EMAIL).ifPresent(user -> {
            boolean tokenExists = emailTokenRepository.findAll().stream()
                    .anyMatch(t -> t.getUser().getId().equals(user.getId())
                            && t.getType() == TokenType.PASSWORD_RESET
                            && !t.isUsed());
            org.assertj.core.api.Assertions.assertThat(tokenExists)
                    .as("A PASSWORD_RESET token must be created after forgot-password")
                    .isTrue();

            // Capture token for subsequent tests
            emailTokenRepository.findAll().stream()
                    .filter(t -> t.getUser().getId().equals(user.getId())
                            && t.getType() == TokenType.PASSWORD_RESET
                            && !t.isUsed())
                    .findFirst()
                    .ifPresent(t -> resetToken = t.getToken());
        });

        org.assertj.core.api.Assertions.assertThat(resetToken)
                .as("resetToken must have been captured from the DB")
                .isNotNull()
                .isNotEmpty();
    }

    @Test
    @Order(4)
    @DisplayName("BF-03 — POST /auth/reset-password with invalid token → 401 TOKEN_INVALID")
    void resetPassword_invalidToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token",       "this-is-not-a-real-token",
                                "newPassword", NEW_PASS
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_INVALID"));
    }

    @Test
    @Order(5)
    @DisplayName("BF-03 — POST /auth/reset-password with valid token → 200, password updated")
    void resetPassword_validToken_returns200() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(resetToken != null,
                "Skipping: resetToken was not captured in test 3");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token",       resetToken,
                                "newPassword", NEW_PASS
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(6)
    @DisplayName("BF-03 — Login with NEW password succeeds after reset")
    void login_afterReset_withNewPassword_returns200() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(resetToken != null,
                "Skipping: reset was not performed");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    EMAIL,
                                "password", NEW_PASS
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value(not(emptyString())));
    }

    @Test
    @Order(7)
    @DisplayName("BF-03 — Login with OLD password fails after reset")
    void login_afterReset_withOldPassword_returns401() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(resetToken != null,
                "Skipping: reset was not performed");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    EMAIL,
                                "password", OLD_PASS
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(8)
    @DisplayName("BF-03 — Reusing the same reset token → 401 TOKEN_INVALID (already used)")
    void resetPassword_tokenAlreadyUsed_returns401() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(resetToken != null,
                "Skipping: reset was not performed");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token",       resetToken,
                                "newPassword", "AnotherPass789!"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_INVALID"));
    }

    @Test
    @Order(9)
    @DisplayName("BF-03 — New password shorter than minimum → 400 VALIDATION_ERROR")
    void resetPassword_shortPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token",       "any-token",
                                "newPassword", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
}
