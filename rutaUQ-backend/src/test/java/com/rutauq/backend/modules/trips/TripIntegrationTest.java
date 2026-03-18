package com.rutauq.backend.modules.trips;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — Trip module (Phase 4).
 *
 * Covers: create trip, list/filter trips, get by ID, update (partial),
 * cancel, role enforcement, seat-capacity validation, and one-trip-per-vehicle rule.
 *
 * Trip fixture: vehicle with 3 seats, price = 5000.00, departure in 7 days.
 *
 * Data lifecycle:
 *  @BeforeAll  → registers DRIVER + CLIENT, creates driver profile + vehicle
 *  @AfterAll   → deletes trips → users (cascades: driver_profile, user_profile, vehicle)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Phase 4 — Trip Integration Tests")
class TripIntegrationTest {

    @Autowired private MockMvc          mockMvc;
    @Autowired private ObjectMapper     objectMapper;
    @Autowired private UserRepository   userRepository;
    @Autowired private TripRepository   tripRepository;
    @Autowired private VehicleRepository vehicleRepository;

    private static final String DRIVER_EMAIL = "test.trip.driver@rutauq.test";
    private static final String CLIENT_EMAIL = "test.trip.client@rutauq.test";
    private static final String PASSWORD     = "SecurePass123!";
    private static final String PLATE        = "TRP001";
    private static final int    SEATS        = 3;
    private static final BigDecimal PRICE    = new BigDecimal("5000");

    private String driverToken;
    private String clientToken;
    private UUID   vehicleId;
    private UUID   tripId;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        cleanupIfExists();

        driverToken = registerAndGetToken(DRIVER_EMAIL, "Carlos", "Driver", "DRIVER");
        clientToken = registerAndGetToken(CLIENT_EMAIL, "Laura",  "Client", "CLIENT");

        // Driver profile is required before creating trips
        mockMvc.perform(post("/api/v1/drivers/profile")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "licenseNumber", "TEST-TRP-LIC-001",
                        "licenseExpiry", "2031-06-30"
                ))));

        // Register vehicle (SEATS capacity)
        MvcResult vRes = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "Mazda", "model", "3",
                                "year", 2022, "color", "Gris",
                                "plate", PLATE, "seats", SEATS
                        ))))
                .andReturn();
        vehicleId = UUID.fromString(extract(vRes, "$.data.id"));
    }

    @AfterAll
    void cleanup() {
        // Trips must be deleted before users (no cascade on trips.driver_id)
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver ->
                tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                        .forEach(trip -> tripRepository.deleteById(trip.getId()))
        );
        // Deleting users cascades: driver_profile, user_profile, vehicles
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // Role enforcement
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("POST /trips — CLIENT role → 403")
    void createTrip_clientRole_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "A", "B", 2, PRICE)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    @DisplayName("POST /trips — no token → 403")
    void createTrip_noToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "A", "B", 2, PRICE)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    @DisplayName("GET /trips — no token → 403")
    void listTrips_noToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/trips"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Validation errors
    // =========================================================================

    @Test
    @Order(4)
    @DisplayName("POST /trips — availableSeats (5) > vehicle capacity (3) → 400 VALIDATION_ERROR")
    void createTrip_seatsExceedCapacity_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "Armenia", "UQ Campus", 5, PRICE)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(5)
    @DisplayName("POST /trips — departure time in the past → 400 VALIDATION_ERROR")
    void createTrip_pastDepartureTime_returns400() throws Exception {
        String pastTime = Instant.now().minus(1, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();

        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "vehicleId",      vehicleId.toString(),
                                "origin",         "Armenia",
                                "destination",    "UQ Campus",
                                "departureTime",  pastTime,
                                "availableSeats", 2,
                                "pricePerSeat",   PRICE
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(6)
    @DisplayName("POST /trips — negative price → 400 VALIDATION_ERROR")
    void createTrip_negativePrice_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "Armenia", "UQ Campus", 2,
                                new BigDecimal("-100"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(7)
    @DisplayName("POST /trips — fractional COP price → 400 VALIDATION_ERROR")
    void createTrip_fractionalPrice_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "Armenia", "UQ Campus", 2,
                                new BigDecimal("51.00"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    // =========================================================================
    // Create trip — happy path
    // =========================================================================

    @Test
    @Order(8)
    @DisplayName("POST /trips — DRIVER with valid data → 201, status=SCHEDULED, captures tripId")
    void createTrip_success() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "Armenia Test", "UQ Campus Test", SEATS, PRICE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.data.origin").value("Armenia Test"))
                .andExpect(jsonPath("$.data.destination").value("UQ Campus Test"))
                .andExpect(jsonPath("$.data.availableSeats").value(SEATS))
                .andExpect(jsonPath("$.data.pricePerSeat").value(5000.00))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.driver.email").value(DRIVER_EMAIL))
                .andExpect(jsonPath("$.data.vehicle.plate").value(PLATE))
                .andReturn();

        tripId = UUID.fromString(extract(result, "$.data.id"));
    }

    @Test
    @Order(9)
    @DisplayName("POST /trips — same vehicle already has a SCHEDULED trip → 403 OPERATION_NOT_PERMITTED")
    void createTrip_vehicleAlreadyScheduled_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody(vehicleId, "Calarca", "UQ Norte", 2, PRICE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_NOT_PERMITTED"));
    }

    // =========================================================================
    // List and filter
    // =========================================================================

    @Test
    @Order(10)
    @DisplayName("GET /trips — authenticated → 200, includes our SCHEDULED trip")
    void listTrips_noFilter_includesOurTrip() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists());
    }

    @Test
    @Order(11)
    @DisplayName("GET /trips?origin=Armenia — case-insensitive partial match → trip found")
    void listTrips_filterByOrigin_returnsMatch() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .param("origin", "Armenia")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists());
    }

    @Test
    @Order(12)
    @DisplayName("GET /trips?destination=UQ+Campus — partial match → trip found")
    void listTrips_filterByDestination_returnsMatch() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .param("destination", "UQ Campus")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists());
    }

    @Test
    @Order(13)
    @DisplayName("GET /trips?minSeats=4 — trip has 3 seats → not in results")
    void listTrips_filterMinSeats_tooHigh_notFound() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .param("minSeats", "4")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").doesNotExist());
    }

    @Test
    @Order(14)
    @DisplayName("GET /trips?minSeats=2 — trip has 3 seats → found")
    void listTrips_filterMinSeats_satisfied_found() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .param("minSeats", "2")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists());
    }

    // =========================================================================
    // My trips (driver view)
    // =========================================================================

    @Test
    @Order(15)
    @DisplayName("GET /trips/my — DRIVER → 200, contains our trip as SCHEDULED")
    void getMyTrips_driver_returnsOwnTrips() throws Exception {
        mockMvc.perform(get("/api/v1/trips/my")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')].status",
                        hasItem("SCHEDULED")));
    }

    @Test
    @Order(16)
    @DisplayName("GET /trips/my — CLIENT role → 403")
    void getMyTrips_clientRole_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/trips/my")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Get by ID
    // =========================================================================

    @Test
    @Order(17)
    @DisplayName("GET /trips/{id} → 200, full detail with nested driver and vehicle summary")
    void getTripById_returns200WithFullDetail() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(tripId.toString()))
                .andExpect(jsonPath("$.data.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.data.driver.email").value(DRIVER_EMAIL))
                .andExpect(jsonPath("$.data.driver.firstName").value("Carlos"))
                .andExpect(jsonPath("$.data.vehicle.plate").value(PLATE))
                .andExpect(jsonPath("$.data.vehicle.seats").value(SEATS));
    }

    @Test
    @Order(18)
    @DisplayName("GET /trips/{randomUUID} → 404 TRIP_NOT_FOUND")
    void getTripById_nonExistent_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("TRIP_NOT_FOUND"));
    }

    // =========================================================================
    // Update trip
    // =========================================================================

    @Test
    @Order(19)
    @DisplayName("PUT /trips/{id} — partial update (description + price) → 200, changes reflected")
    void updateTrip_partialUpdate_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Salida puntual, trae efectivo",
                                "pricePerSeat", new BigDecimal("4500")
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Salida puntual, trae efectivo"))
                .andExpect(jsonPath("$.data.pricePerSeat").value(4500.00))
                .andExpect(jsonPath("$.data.availableSeats").value(SEATS)); // unchanged
    }

    @Test
    @Order(20)
    @DisplayName("PUT /trips/{id} — update availableSeats above vehicle capacity → 400 VALIDATION_ERROR")
    void updateTrip_seatsExceedCapacity_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "availableSeats", SEATS + 10
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(21)
    @DisplayName("PUT /trips/{id} — CLIENT role → 403")
    void updateTrip_clientRole_returns403() throws Exception {
        mockMvc.perform(put("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("description", "hack"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Cancel trip
    // =========================================================================

    @Test
    @Order(22)
    @DisplayName("DELETE /trips/{id} — DRIVER cancels own trip → 200, status CANCELLED")
    void cancelTrip_returns200() throws Exception {
        mockMvc.perform(delete("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Trip cancelled"));

        // Verify status changed
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    @Order(23)
    @DisplayName("PUT /trips/{id} on CANCELLED trip → 409 TRIP_ALREADY_CLOSED")
    void updateTrip_cancelled_returns409() throws Exception {
        mockMvc.perform(put("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("description", "updated"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("TRIP_ALREADY_CLOSED"));
    }

    @Test
    @Order(24)
    @DisplayName("DELETE /trips/{id} on CANCELLED trip → 409 TRIP_ALREADY_CLOSED")
    void cancelTrip_alreadyCancelled_returns409() throws Exception {
        mockMvc.perform(delete("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("TRIP_ALREADY_CLOSED"));
    }

    @Test
    @Order(25)
    @DisplayName("GET /trips (public list) — CANCELLED trip not included (only SCHEDULED shown)")
    void listTrips_cancelledTripNotVisible() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").doesNotExist());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String tripBody(UUID vehicleId, String origin, String destination,
                             int seats, BigDecimal price) throws Exception {
        String departure = Instant.now().plus(7, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();
        return objectMapper.writeValueAsString(Map.of(
                "vehicleId",      vehicleId.toString(),
                "origin",         origin,
                "destination",    destination,
                "departureTime",  departure,
                "availableSeats", seats,
                "pricePerSeat",   price
        ));
    }

    private String registerAndGetToken(String email, String firstName,
                                        String lastName, String role) throws Exception {
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
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver -> {
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(t -> tripRepository.deleteById(t.getId()));
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }
}
