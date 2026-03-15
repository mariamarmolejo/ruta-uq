package com.rutauq.backend.modules.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rutauq.backend.modules.auth.dto.LoginRequest;
import com.rutauq.backend.modules.auth.dto.RegisterRequest;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.drivers.repository.DriverProfileRepository;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import com.rutauq.backend.modules.users.repository.UserProfileRepository;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Auth Controller Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private DriverProfileRepository driverProfileRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    private static final String EMAIL = "test.phase2@rutauq.com";
    private static final String PASSWORD = "TestPass123!";

    @BeforeAll
    void cleanDbBeforeAuthTests() {
        // Delete in FK order so auth tests run against a clean user table
        reservationRepository.deleteAll();
        tripRepository.deleteAll();
        vehicleRepository.deleteAll();
        driverProfileRepository.deleteAll();
        userProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/v1/auth/register - should create user and return registration info")
    void register_shouldReturnToken() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("Carlos");
        request.setLastName("Gomez");
        request.setEmail(EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(EMAIL))
                .andExpect(jsonPath("$.data.firstName").value("Carlos"))
                .andExpect(jsonPath("$.data.lastName").value("Gomez"));

        // Bypass email verification so login in test 3 works
        userRepository.findByEmail(EMAIL).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/v1/auth/register - duplicate email should return 409")
    void register_duplicateEmail_shouldReturn409() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("Carlos");
        request.setLastName("Gomez");
        request.setEmail(EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("USER_ALREADY_EXISTS"));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/v1/auth/login - should return token with valid credentials")
    void login_shouldReturnToken() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value(EMAIL));
    }

    @Test
    @Order(4)
    @DisplayName("POST /api/v1/auth/login - wrong password should return 401")
    void login_wrongPassword_shouldReturn401() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(EMAIL);
        request.setPassword("WrongPassword!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(5)
    @DisplayName("POST /api/v1/auth/register - invalid email should return 400")
    void register_invalidEmail_shouldReturn400() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("Test");
        request.setLastName("User");
        request.setEmail("not-an-email");
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
}
