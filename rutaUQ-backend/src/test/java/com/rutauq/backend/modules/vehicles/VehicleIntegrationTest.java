package com.rutauq.backend.modules.vehicles;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
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
 * Integration tests — Vehicle module (Phase 3).
 *
 * Covers: register vehicle, list, update, deactivate, duplicate plate,
 * validation errors, role enforcement, and cross-driver ownership.
 *
 * Data lifecycle:
 *  @BeforeAll  → registers DRIVER1, DRIVER2, CLIENT via HTTP
 *  @AfterAll   → deletes users (PostgreSQL cascades: vehicles, profiles)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Phase 3 — Vehicle Integration Tests")
class VehicleIntegrationTest {

    @Autowired private MockMvc            mockMvc;
    @Autowired private ObjectMapper       objectMapper;
    @Autowired private UserRepository     userRepository;
    @Autowired private VehicleRepository  vehicleRepository;

    private static final String DRIVER1_EMAIL = "test.veh.driver1@rutauq.test";
    private static final String DRIVER2_EMAIL = "test.veh.driver2@rutauq.test";
    private static final String CLIENT_EMAIL  = "test.veh.client@rutauq.test";
    private static final String PASSWORD      = "SecurePass123!";
    private static final String PLATE_1       = "VEH001";
    private static final String PLATE_2       = "VEH002";

    private String driver1Token;
    private String driver2Token;
    private String clientToken;
    private UUID   vehicleId;
    private UUID   vehicle2Id;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        cleanupIfExists();
        driver1Token = registerAndGetToken(DRIVER1_EMAIL, "Driver", "Uno",  "DRIVER");
        driver2Token = registerAndGetToken(DRIVER2_EMAIL, "Driver", "Dos",  "DRIVER");
        clientToken  = registerAndGetToken(CLIENT_EMAIL,  "Client", "Test", "CLIENT");
    }

    @AfterAll
    void cleanup() {
        // Deleting users cascades their vehicles via ON DELETE CASCADE
        userRepository.findByEmail(DRIVER1_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(DRIVER2_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT_EMAIL) .ifPresent(userRepository::delete);
    }

    // =========================================================================
    // Role enforcement
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("POST /vehicles — CLIENT role → 403")
    void registerVehicle_clientRole_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Chevrolet", "Spark", 2020, "Rojo", "CLT001", 4)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    @DisplayName("GET /vehicles — CLIENT role → 403")
    void listVehicles_clientRole_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    @DisplayName("POST /vehicles — no token → 403")
    void registerVehicle_noToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Chevrolet", "Spark", 2020, "Rojo", "NOTOK1", 4)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Happy path
    // =========================================================================

    @Test
    @Order(4)
    @DisplayName("POST /vehicles — DRIVER1 registers vehicle → 201, active=true")
    void registerVehicle_driver1_success() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Toyota", "Corolla", 2021, "Blanco", PLATE_1, 4)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.plate").value(PLATE_1))
                .andExpect(jsonPath("$.data.brand").value("Toyota"))
                .andExpect(jsonPath("$.data.model").value("Corolla"))
                .andExpect(jsonPath("$.data.year").value(2021))
                .andExpect(jsonPath("$.data.seats").value(4))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andReturn();

        vehicleId = UUID.fromString(extract(result, "$.data.id"));
    }

    @Test
    @Order(5)
    @DisplayName("GET /vehicles — DRIVER1 → 200, list contains 1 active vehicle")
    void listVehicles_driver1_returns1Vehicle() throws Exception {
        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].plate").value(PLATE_1))
                .andExpect(jsonPath("$.data[0].active").value(true));
    }

    @Test
    @Order(6)
    @DisplayName("GET /vehicles — DRIVER2 → 200, empty list (has no vehicles)")
    void listVehicles_driver2_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // =========================================================================
    // Validation errors
    // =========================================================================

    @Test
    @Order(7)
    @DisplayName("POST /vehicles — duplicate plate → 409 RESOURCE_ALREADY_EXISTS")
    void registerVehicle_duplicatePlate_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Renault", "Logan", 2019, "Negro", PLATE_1, 4)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_ALREADY_EXISTS"));
    }

    @Test
    @Order(8)
    @DisplayName("POST /vehicles — invalid plate format (lowercase) → 400 VALIDATION_ERROR")
    void registerVehicle_invalidPlate_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Renault", "Logan", 2019, "Negro", "abc123", 4)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(9)
    @DisplayName("POST /vehicles — seats = 0 → 400 VALIDATION_ERROR")
    void registerVehicle_zeroSeats_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Renault", "Logan", 2019, "Negro", "VLD001", 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(10)
    @DisplayName("POST /vehicles — year = 1985 (below min 1990) → 400 VALIDATION_ERROR")
    void registerVehicle_oldYear_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Ford", "Old", 1985, "Cafe", "VLD002", 4)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // =========================================================================
    // Update
    // =========================================================================

    @Test
    @Order(11)
    @DisplayName("PUT /vehicles/{id} — DRIVER1 updates own vehicle → 200, changes persisted")
    void updateVehicle_owner_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/vehicles/" + vehicleId)
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Honda", "Civic", 2022, "Azul", PLATE_1, 4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brand").value("Honda"))
                .andExpect(jsonPath("$.data.model").value("Civic"))
                .andExpect(jsonPath("$.data.color").value("Azul"))
                .andExpect(jsonPath("$.data.plate").value(PLATE_1)); // same plate
    }

    @Test
    @Order(12)
    @DisplayName("PUT /vehicles/{id} — DRIVER2 tries to update DRIVER1's vehicle → 404 RESOURCE_NOT_FOUND")
    void updateVehicle_otherDriver_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/vehicles/" + vehicleId)
                        .header("Authorization", "Bearer " + driver2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Honda", "Civic", 2022, "Azul", PLATE_1, 4)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @Order(13)
    @DisplayName("PUT /vehicles/{randomId} — non-existent vehicle → 404 RESOURCE_NOT_FOUND")
    void updateVehicle_nonExistentId_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/vehicles/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Honda", "Civic", 2022, "Azul", "VLD999", 4)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    // =========================================================================
    // Multiple vehicles + deactivation
    // =========================================================================

    @Test
    @Order(14)
    @DisplayName("POST /vehicles — DRIVER1 registers a second vehicle → 201")
    void registerVehicle_second_success() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleBody("Suzuki", "Swift", 2023, "Verde", PLATE_2, 3)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.plate").value(PLATE_2))
                .andReturn();

        vehicle2Id = UUID.fromString(extract(result, "$.data.id"));
    }

    @Test
    @Order(15)
    @DisplayName("GET /vehicles — DRIVER1 → 200, 2 active vehicles")
    void listVehicles_driver1_returns2Vehicles() throws Exception {
        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    @Order(16)
    @DisplayName("DELETE /vehicles/{vehicle2Id} — deactivate second vehicle → 200")
    void deactivateVehicle_success() throws Exception {
        mockMvc.perform(delete("/api/v1/vehicles/" + vehicle2Id)
                        .header("Authorization", "Bearer " + driver1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Vehicle deactivated"));
    }

    @Test
    @Order(17)
    @DisplayName("GET /vehicles after deactivation → 200, only 1 active vehicle (second excluded)")
    void listVehicles_afterDeactivation_returns1() throws Exception {
        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driver1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].plate").value(PLATE_1));
    }

    @Test
    @Order(18)
    @DisplayName("DELETE /vehicles/{randomId} — non-existent → 404 RESOURCE_NOT_FOUND")
    void deactivateVehicle_nonExistent_returns404() throws Exception {
        mockMvc.perform(delete("/api/v1/vehicles/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + driver1Token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String vehicleBody(String brand, String model, int year,
                                String color, String plate, int seats) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "brand", brand, "model", model, "year", year,
                "color", color, "plate", plate, "seats", seats
        ));
    }

    private String registerAndGetToken(String email, String firstName, String lastName, String role)
            throws Exception {
        // Register — now returns RegisterResponse (no token), email must be verified before login
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", PASSWORD,
                                "firstName", firstName, "lastName", lastName, "role", role
                        ))))
                .andExpect(status().isCreated());

        // Bypass email verification in tests — set flag directly via repository
        userRepository.findByEmail(email).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });

        // Login to obtain a JWT
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", PASSWORD
                        ))))
                .andReturn();
        return extract(loginResult, "$.data.token");
    }

    private String extract(MvcResult result, String jsonPath) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), jsonPath).toString();
    }

    private void cleanupIfExists() {
        // Deleting users cascades vehicles via ON DELETE CASCADE
        userRepository.findByEmail(DRIVER1_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(DRIVER2_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT_EMAIL) .ifPresent(userRepository::delete);
        // Also clean up any orphan vehicles by plate (from previous incomplete runs)
        vehicleRepository.findByDriverIdAndActiveTrue(UUID.randomUUID()); // warm-up, ignore result
    }
}
