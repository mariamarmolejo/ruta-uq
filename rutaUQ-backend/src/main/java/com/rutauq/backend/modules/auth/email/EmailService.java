package com.rutauq.backend.modules.auth.email;

import com.rutauq.backend.modules.auth.domain.EmailToken;
import com.rutauq.backend.modules.auth.domain.TokenType;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.repository.EmailTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailTokenRepository emailTokenRepository;
    private final EmailSender emailSender;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Transactional
    public void sendVerificationEmail(User user) {
        emailTokenRepository.deleteByUserIdAndType(user.getId(), TokenType.VERIFICATION);

        String tokenValue = UUID.randomUUID().toString();
        emailTokenRepository.save(EmailToken.builder()
                .user(user)
                .token(tokenValue)
                .type(TokenType.VERIFICATION)
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .build());

        String link = frontendBaseUrl + "/verify-email?token=" + tokenValue;
        try {
            emailSender.send(
                    user.getEmail(),
                    "Verify your email – Ruta Compartida UQ",
                    buildVerificationBody(user.getFirstName(), link));
        } catch (Exception e) {
            log.error("Failed to dispatch verification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Transactional
    public void sendPasswordResetEmail(User user) {
        emailTokenRepository.deleteByUserIdAndType(user.getId(), TokenType.PASSWORD_RESET);

        String tokenValue = UUID.randomUUID().toString();
        emailTokenRepository.save(EmailToken.builder()
                .user(user)
                .token(tokenValue)
                .type(TokenType.PASSWORD_RESET)
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build());

        String link = frontendBaseUrl + "/reset-password?token=" + tokenValue;
        try {
            emailSender.send(
                    user.getEmail(),
                    "Reset your password – Ruta Compartida UQ",
                    buildPasswordResetBody(user.getFirstName(), link));
        } catch (Exception e) {
            log.error("Failed to dispatch password reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String buildVerificationBody(String firstName, String link) {
        return "Hello " + firstName + ",\n\n"
                + "Thank you for registering at Ruta Compartida UQ.\n"
                + "Please verify your email address by clicking the link below:\n\n"
                + link + "\n\n"
                + "This link expires in 24 hours.\n\n"
                + "If you did not create an account, please ignore this email.\n\n"
                + "Ruta Compartida UQ";
    }

    private String buildPasswordResetBody(String firstName, String link) {
        return "Hello " + firstName + ",\n\n"
                + "We received a request to reset your password.\n"
                + "Click the link below to set a new password:\n\n"
                + link + "\n\n"
                + "This link expires in 1 hour.\n\n"
                + "If you did not request a password reset, please ignore this email.\n\n"
                + "Ruta Compartida UQ";
    }
}
