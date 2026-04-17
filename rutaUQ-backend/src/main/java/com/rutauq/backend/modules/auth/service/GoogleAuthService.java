package com.rutauq.backend.modules.auth.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.dto.AuthResponse;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.shared.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RestTemplate restTemplate;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    private static final String TOKENINFO_URL =
            "https://oauth2.googleapis.com/tokeninfo?id_token={idToken}";

    @Transactional
    public AuthResponse authenticateWithGoogle(String idToken) {
        Map<?, ?> tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(TOKENINFO_URL, Map.class, idToken);
        } catch (Exception e) {
            log.warn("Google tokeninfo request failed: {}", e.getMessage());
            throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID, "Invalid Google ID token");
        }

        if (tokenInfo == null || tokenInfo.containsKey("error")) {
            throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID, "Invalid Google ID token");
        }

        if (StringUtils.hasText(googleClientId)) {
            String aud = (String) tokenInfo.get("aud");
            if (!googleClientId.equals(aud)) {
                throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID, "Token audience mismatch");
            }
        }

        String googleId = (String) tokenInfo.get("sub");
        String email    = (String) tokenInfo.get("email");
        Object nameObj  = tokenInfo.get("name");
        String name     = nameObj != null ? (String) nameObj : email;

        String firstName = name.contains(" ") ? name.substring(0, name.indexOf(' ')) : name;
        String lastName  = name.contains(" ") ? name.substring(name.indexOf(' ') + 1) : "";

        User user = userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(User.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .googleId(googleId)
                        .role(Role.CLIENT)
                        .emailVerified(true)
                        .enabled(true)
                        .build())
        );

        if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);
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
