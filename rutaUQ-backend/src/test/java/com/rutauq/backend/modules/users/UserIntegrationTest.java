package com.rutauq.backend.modules.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — User profile module (Phase 3).
 *
 * Covers: view profile, partial update, privacy consent (Habeas Data),
 * self vs admin access control, and validation.
 *
 * Data lifecycle:
 *  @BeforeAll  → registers CLIENT and ADMIN users via HTTP
 *  @AfterAll   → deletes both users (user_profiles cascade via ON DELETE CASCADE)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Phase 3 — User Profile Integration Tests")
class UserIntegrationTest {

    @Autowired private MockMvc        mockMvc;
    @Autowired private ObjectMapper   objectMapper;
    @Autowired private UserRepository userRepository;

    private static final String CLIENT_EMAIL = "test.user.client@rutauq.test";
    private static final String ADMIN_EMAIL  = "test.user.admin@rutauq.test";
    private static final String PASSWORD     = "SecurePass123!";

    private String clientToken;
    private String adminToken;
    private UUID   clientId;
    private UUID   adminId;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        cleanupIfExists();

        // Register CLIENT → verify email → login → capture token
        register(CLIENT_EMAIL, "Ana", "Torres", "CLIENT");
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });
        MvcResult clientLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", CLIENT_EMAIL, "password", PASSWORD
                        ))))
                .andReturn();
        clientToken = extract(clientLoginResult, "$.data.token");
        clientId    = userRepository.findByEmail(CLIENT_EMAIL).orElseThrow().getId();

        // Register ADMIN → verify email → login → capture token
        register(ADMIN_EMAIL, "Admin", "Sys", "ADMIN");
        userRepository.findByEmail(ADMIN_EMAIL).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });
        MvcResult adminLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", ADMIN_EMAIL, "password", PASSWORD
                        ))))
                .andReturn();
        adminToken = extract(adminLoginResult, "$.data.token");
        adminId    = userRepository.findByEmail(ADMIN_EMAIL).orElseThrow().getId();
    }

    @AfterAll
    void cleanup() {
        // user_profiles cascade via ON DELETE CASCADE
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(ADMIN_EMAIL) .ifPresent(userRepository::delete);
    }

    // =========================================================================
    // Tests
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("GET /users/me without token → 403")
    void getMyProfile_withoutToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    @DisplayName("GET /users/me → 200, basic user data, no extended profile yet")
    void getMyProfile_freshUser_returnsBasicData() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL))
                .andExpect(jsonPath("$.data.firstName").value("Ana"))
                .andExpect(jsonPath("$.data.lastName").value("Torres"))
                .andExpect(jsonPath("$.data.role").value("CLIENT"))
                .andExpect(jsonPath("$.data.privacyAccepted").value(false))
                .andExpect(jsonPath("$.data.id").isNotEmpty());
    }

    @Test
    @Order(3)
    @DisplayName("PUT /users/me — partial update: firstName, bio → 200, values persisted")
    void updateMyProfile_partialFields_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "AnaUpdated",
                                "bio",       "Estudiante de Ingeniería UQ"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.firstName").value("AnaUpdated"))
                .andExpect(jsonPath("$.data.bio").value("Estudiante de Ingeniería UQ"))
                .andExpect(jsonPath("$.data.lastName").value("Torres"))   // unchanged
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL)); // unchanged
    }

    @Test
    @Order(4)
    @DisplayName("PUT /users/me — accept privacy consent (Habeas Data) → 200, privacyAccepted=true, timestamp set")
    void updateMyProfile_acceptPrivacyConsent_setsTimestamp() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "privacyAccepted", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.privacyAccepted").value(true))
                .andExpect(jsonPath("$.data.privacyAcceptedAt").isNotEmpty());
    }

    @Test
    @Order(5)
    @DisplayName("PUT /users/me — accept privacy consent again → 200, idempotent (no error, stays true)")
    void updateMyProfile_acceptPrivacyConsentAgain_isIdempotent() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "privacyAccepted", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.privacyAccepted").value(true));
    }

    @Test
    @Order(6)
    @DisplayName("GET /users/me → 200, reflects all previous updates")
    void getMyProfile_reflectsAllUpdates() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.firstName").value("AnaUpdated"))
                .andExpect(jsonPath("$.data.bio").value("Estudiante de Ingeniería UQ"))
                .andExpect(jsonPath("$.data.privacyAccepted").value(true))
                .andExpect(jsonPath("$.data.privacyAcceptedAt").isNotEmpty());
    }

    @Test
    @Order(7)
    @DisplayName("GET /users/{id} — self access → 200")
    void getUserById_selfAccess_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + clientId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(clientId.toString()))
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL));
    }

    @Test
    @Order(8)
    @DisplayName("GET /users/{adminId} — CLIENT accessing ADMIN profile → 403 ACCESS_DENIED")
    void getUserById_otherUserAccess_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + adminId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(9)
    @DisplayName("GET /users/{clientId} — ADMIN accessing CLIENT profile → 200")
    void getUserById_adminAccess_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + clientId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL));
    }

    @Test
    @Order(10)
    @DisplayName("GET /users/{randomUUID} — ADMIN, non-existent ID → 404 USER_NOT_FOUND")
    void getUserById_nonExistent_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("USER_NOT_FOUND"));
    }

    @Test
    @Order(11)
    @DisplayName("PUT /users/me — invalid phone format → 400 VALIDATION_ERROR")
    void updateMyProfile_invalidPhone_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", "not-a-phone"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(12)
    @DisplayName("PUT /users/me — valid phone → 200, phone updated")
    void updateMyProfile_validPhone_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", "+573001234567"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.phone").value("+573001234567"));
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private MvcResult register(String email, String firstName, String lastName, String role)
            throws Exception {
        return mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",     email,
                                "password",  PASSWORD,
                                "firstName", firstName,
                                "lastName",  lastName,
                                "role",      role
                        ))))
                .andReturn();
    }

    private String extract(MvcResult result, String jsonPath) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), jsonPath).toString();
    }

    private void cleanupIfExists() {
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(ADMIN_EMAIL) .ifPresent(userRepository::delete);
    }
}
