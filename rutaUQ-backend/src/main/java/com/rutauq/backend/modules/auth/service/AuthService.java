package com.rutauq.backend.modules.auth.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.captcha.CaptchaValidator;
import com.rutauq.backend.modules.auth.domain.EmailToken;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.TokenType;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.dto.AuthResponse;
import com.rutauq.backend.modules.auth.dto.LoginRequest;
import com.rutauq.backend.modules.auth.dto.RegisterRequest;
import com.rutauq.backend.modules.auth.dto.RegisterResponse;
import com.rutauq.backend.modules.auth.email.EmailService;
import com.rutauq.backend.modules.auth.repository.EmailTokenRepository;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.shared.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final EmailTokenRepository emailTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationConfiguration authenticationConfiguration;
    private final CaptchaValidator captchaValidator;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       EmailTokenRepository emailTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationConfiguration authenticationConfiguration,
                       CaptchaValidator captchaValidator,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.emailTokenRepository = emailTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationConfiguration = authenticationConfiguration;
        this.captchaValidator = captchaValidator;
        this.emailService = emailService;
    }

    private AuthenticationManager getAuthenticationManager() throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (!captchaValidator.validate(request.getCaptchaToken())) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED, "Captcha validation failed");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_ALREADY_EXISTS);
        }

        Role assignedRole = request.getRole() != null ? request.getRole() : Role.CLIENT;

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(assignedRole)
                .enabled(true)
                .emailVerified(false)
                .build();

        userRepository.save(user);
        log.info("New user registered: {} with role {}", user.getEmail(), user.getRole());

        emailService.sendVerificationEmail(user);

        return RegisterResponse.builder()
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        if (!captchaValidator.validate(request.getCaptchaToken())) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED, "Captcha validation failed");
        }

        try {
            getAuthenticationManager().authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail().toLowerCase().trim(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!user.isEnabled()) {
            throw new AppException(ErrorCode.USER_DISABLED);
        }

        if (!user.isEmailVerified()) {
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        String token = jwtService.generateToken(user);
        log.info("User logged in: {}", user.getEmail());

        return buildAuthResponse(user, token);
    }

    @Transactional
    public void verifyEmail(String tokenValue) {
        EmailToken token = emailTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID,
                        "Invalid or expired verification link"));

        if (token.isUsed()) {
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "This verification link has already been used");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "This verification link has expired");
        }

        if (token.getType() != TokenType.VERIFICATION) {
            throw new AppException(ErrorCode.TOKEN_INVALID, "Invalid token type");
        }

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        token.setUsed(true);
        emailTokenRepository.save(token);

        log.info("Email verified for user: {}", user.getEmail());
    }

    @Transactional
    public void forgotPassword(String email) {
        // Always respond with success — never reveal whether the email exists
        userRepository.findByEmail(email.toLowerCase().trim()).ifPresent(user -> {
            try {
                emailService.sendPasswordResetEmail(user);
            } catch (Exception e) {
                log.warn("Could not send password reset email to {}: {}", email, e.getMessage());
            }
        });
    }

    @Transactional
    public void resetPassword(String tokenValue, String newPassword) {
        EmailToken token = emailTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID,
                        "Invalid or expired reset link"));

        if (token.isUsed()) {
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "This reset link has already been used");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "This reset link has expired");
        }

        if (token.getType() != TokenType.PASSWORD_RESET) {
            throw new AppException(ErrorCode.TOKEN_INVALID, "Invalid token type");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        emailTokenRepository.save(token);

        log.info("Password reset for user: {}", user.getEmail());
    }

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.isEmailVerified()) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "This email address has already been verified");
        }

        emailService.sendVerificationEmail(user);
        log.info("Verification email resent to {}", user.getEmail());
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .expiresIn(jwtService.getExpiration())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .build();
    }
}
