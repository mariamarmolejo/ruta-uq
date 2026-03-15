package com.rutauq.backend.modules.auth;

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

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — Authentication module (Phase 2).
 *
 * Covers: register, login, JWT generation, role assignment,
 * input validation, and security of protected endpoints.
 *
 * Data lifecycle:
 *  @BeforeAll  → cleanupIfExists() removes leftovers from prior aborted runs
 *  Tests       → create users in the DB via HTTP
 *  @AfterAll   → deletes all users created during the test suite
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Phase 2 — Authentication Integration Tests")
class AuthIntegrationTest {

    @Autowired private MockMvc       mockMvc;
    @Autowired private ObjectMapper  objectMapper;
    @Autowired private UserRepository userRepository;

    // Emails uniquely scoped to this test class
    private static final String CLIENT_EMAIL  = "test.auth.client@rutauq.test";
    private static final String DRIVER_EMAIL  = "test.auth.driver@rutauq.test";
    private static final String NOROLE_EMAIL  = "test.auth.norole@rutauq.test";
    private static final String PASSWORD      = "SecurePass123!";

    // Captured from registration responses
    private String clientToken;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() {
        cleanupIfExists();
    }

    @AfterAll
    void cleanup() {
        userRepository.findByEmail(CLIENT_EMAIL) .ifPresent(userRepository::delete);
        userRepository.findByEmail(DRIVER_EMAIL) .ifPresent(userRepository::delete);
        userRepository.findByEmail(NOROLE_EMAIL) .ifPresent(userRepository::delete);
    }

    // =========================================================================
    // Registration tests
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("Register CLIENT with valid data → 201, email/name returned, verification required")
    void register_client_success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Juan",
                                "lastName",  "Perez",
                                "email",     CLIENT_EMAIL,
                                "password",  PASSWORD,
                                "role",      "CLIENT"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL))
                .andExpect(jsonPath("$.data.firstName").value("Juan"))
                .andExpect(jsonPath("$.data.lastName").value("Perez"));

        // Bypass email verification so subsequent login tests work
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });

        // Capture clientToken via login (registration no longer returns a JWT)
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", CLIENT_EMAIL, "password", PASSWORD
                        ))))
                .andReturn();
        clientToken = extract(loginResult, "$.data.token");
    }

    @Test
    @Order(2)
    @DisplayName("Register DRIVER → 201, email returned")
    void register_driver_success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Maria",
                                "lastName",  "Lopez",
                                "email",     DRIVER_EMAIL,
                                "password",  PASSWORD,
                                "role",      "DRIVER"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(DRIVER_EMAIL));
    }

    @Test
    @Order(3)
    @DisplayName("Register without role field → 201, registration response returned")
    void register_withoutRole_defaultsToClient() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Pedro",
                                "lastName",  "Gomez",
                                "email",     NOROLE_EMAIL,
                                "password",  PASSWORD
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(4)
    @DisplayName("Register with duplicate email → 409 USER_ALREADY_EXISTS")
    void register_duplicateEmail_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Other",
                                "lastName",  "Person",
                                "email",     CLIENT_EMAIL,   // already registered in test 1
                                "password",  PASSWORD
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("USER_ALREADY_EXISTS"));
    }

    @Test
    @Order(5)
    @DisplayName("Register with invalid email format → 400 VALIDATION_ERROR")
    void register_invalidEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Test",
                                "lastName",  "User",
                                "email",     "not-a-valid-email",
                                "password",  PASSWORD
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(6)
    @DisplayName("Register with password shorter than 8 chars → 400 VALIDATION_ERROR")
    void register_shortPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Test",
                                "lastName",  "User",
                                "email",     "short.pass@rutauq.test",
                                "password",  "1234567"   // 7 chars, minimum is 8
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(7)
    @DisplayName("Register with missing firstName → 400 VALIDATION_ERROR")
    void register_missingFirstName_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "lastName", "User",
                                "email",    "nofirstname@rutauq.test",
                                "password", PASSWORD
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // =========================================================================
    // Login tests
    // =========================================================================

    @Test
    @Order(8)
    @DisplayName("Login CLIENT with correct credentials → 200, token returned")
    void login_validCredentials_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    CLIENT_EMAIL,
                                "password", PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.token").value(not(emptyString())))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL))
                .andExpect(jsonPath("$.data.role").value("CLIENT"));
    }

    @Test
    @Order(9)
    @DisplayName("Login with wrong password → 401 INVALID_CREDENTIALS")
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    CLIENT_EMAIL,
                                "password", "WrongPassword999!"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(10)
    @DisplayName("Login with non-existent email → 401 INVALID_CREDENTIALS")
    void login_nonExistentUser_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    "nobody@rutauq.test",
                                "password", PASSWORD
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(11)
    @DisplayName("Login with missing password field → 400 VALIDATION_ERROR")
    void login_missingPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", CLIENT_EMAIL
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(12)
    @DisplayName("JWT token from login is valid — can access protected endpoint")
    void registrationToken_isUsableOnProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(CLIENT_EMAIL));
    }

    @Test
    @Order(13)
    @DisplayName("Protected endpoint without token → 403")
    void protectedEndpoint_withoutToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(14)
    @DisplayName("Protected endpoint with malformed token → 403")
    void protectedEndpoint_malformedToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer this.is.not.a.valid.jwt"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String extract(MvcResult result, String jsonPath) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), jsonPath).toString();
    }

    private void cleanupIfExists() {
        userRepository.findByEmail(CLIENT_EMAIL) .ifPresent(userRepository::delete);
        userRepository.findByEmail(DRIVER_EMAIL) .ifPresent(userRepository::delete);
        userRepository.findByEmail(NOROLE_EMAIL) .ifPresent(userRepository::delete);
    }
}
