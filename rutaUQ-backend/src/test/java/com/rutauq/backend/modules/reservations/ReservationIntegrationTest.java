package com.rutauq.backend.modules.reservations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
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
 * Full integration tests for the Reservation module (Phase 5).
 *
 * Strategy:
 *  - @BeforeAll  creates real test data in the DB via HTTP endpoints (full stack)
 *  - @AfterAll   deletes all created data in FK order (reservations → trips → users)
 *  - cleanupIfExists() guards against leftover data from a previously aborted run
 *  - @TestInstance(PER_CLASS) lets @BeforeAll/@AfterAll be non-static and use @Autowired
 *
 * Trip fixture: 2 seats, price = 3500.00
 *  → CLIENT1 reserves 2 seats (totalPrice = 7000.00, 0 seats left)
 *  → CLIENT2 is used only for the over-booking scenario
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Phase 5 — Reservation Integration Tests")
class ReservationIntegrationTest {

    // -------------------------------------------------------------------------
    // Injected infrastructure
    // -------------------------------------------------------------------------

    @Autowired private MockMvc          mockMvc;
    @Autowired private ObjectMapper     objectMapper;
    @Autowired private UserRepository         userRepository;
    @Autowired private TripRepository         tripRepository;
    @Autowired private VehicleRepository      vehicleRepository;
    @Autowired private ReservationRepository  reservationRepository;

    // -------------------------------------------------------------------------
    // Test-data constants
    // -------------------------------------------------------------------------

    private static final String CLIENT1_EMAIL = "test.res.client1@rutauq.test";
    private static final String CLIENT2_EMAIL = "test.res.client2@rutauq.test";
    private static final String DRIVER_EMAIL  = "test.res.driver@rutauq.test";
    private static final String PASSWORD      = "TestPass123!";
    private static final BigDecimal PRICE     = new BigDecimal("3500.00");
    private static final int TRIP_SEATS       = 2;

    // -------------------------------------------------------------------------
    // Shared state across ordered tests (populated in @BeforeAll)
    // -------------------------------------------------------------------------

    private String client1Token;
    private String client2Token;
    private String driverToken;
    private UUID   client1Id;
    private UUID   client2Id;
    private UUID   driverId;
    private UUID   vehicleId;
    private UUID   tripId;
    private UUID   reservationId;   // captured in test #1, used in subsequent tests

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setupTestData() throws Exception {
        // Guard: remove any leftover data from a previously aborted run
        cleanupIfExists();

        // Register users
        client1Token = registerUser(CLIENT1_EMAIL, "Test", "Client1", "CLIENT");
        client1Id    = userIdByEmail(CLIENT1_EMAIL);

        client2Token = registerUser(CLIENT2_EMAIL, "Test", "Client2", "CLIENT");
        client2Id    = userIdByEmail(CLIENT2_EMAIL);

        driverToken  = registerUser(DRIVER_EMAIL, "Test", "Driver", "DRIVER");
        driverId     = userIdByEmail(DRIVER_EMAIL);

        // Create driver profile (required before creating trips)
        mockMvc.perform(post("/api/v1/drivers/profile")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "licenseNumber", "TEST-DRV-RES-001",
                        "licenseExpiry", "2030-12-31"
                ))));

        // Register a vehicle (TRIP_SEATS capacity)
        MvcResult vehicleResult = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "TestBrand",
                                "model", "TestModel",
                                "year",  2022,
                                "color", "Azul",
                                "plate", "RES001",
                                "seats", TRIP_SEATS
                        ))))
                .andReturn();
        vehicleId = UUID.fromString(extract(vehicleResult, "$.data.id"));

        // Create a trip departing in 7 days
        String departure = Instant.now().plus(7, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();

        MvcResult tripResult = mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "vehicleId",      vehicleId.toString(),
                                "origin",         "Armenia Test",
                                "destination",    "UQ Campus Test",
                                "departureTime",  departure,
                                "availableSeats", TRIP_SEATS,
                                "pricePerSeat",   PRICE,
                                "description",    "Integration test trip — will be cleaned up"
                        ))))
                .andReturn();
        tripId = UUID.fromString(extract(tripResult, "$.data.id"));
    }

    @AfterAll
    void cleanupTestData() {
        // Delete in FK order to avoid constraint violations:
        //  1. reservations  (FK → trips, FK → users)
        //  2. trips         (FK → users, FK → vehicles)
        //  3. users         (PostgreSQL CASCADE deletes: driver_profile, user_profile, vehicles)
        reservationRepository.findByTripId(tripId)
                .forEach(r -> reservationRepository.deleteById(r.getId()));

        tripRepository.findById(tripId)
                .ifPresent(tripRepository::delete);

        // Deleting driver user cascades: driver_profile, user_profile, vehicle
        userRepository.findByEmail(DRIVER_EMAIL) .ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT1_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT2_EMAIL).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // Tests
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("CLIENT1 reserves 2 seats → 201, status PENDING_PAYMENT, totalPrice = 7000.00")
    void createReservation_success() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + client1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 2
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.seatsReserved").value(2))
                .andExpect(jsonPath("$.data.totalPrice").value(7000.00))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.trip.id").value(tripId.toString()))
                .andExpect(jsonPath("$.data.trip.origin").value("Armenia Test"))
                .andExpect(jsonPath("$.data.trip.pricePerSeat").value(3500.00))
                .andExpect(jsonPath("$.data.passenger.email").value(CLIENT1_EMAIL))
                .andReturn();

        // Capture reservationId for use in subsequent tests
        reservationId = UUID.fromString(extract(result, "$.data.id"));
    }

    @Test
    @Order(2)
    @DisplayName("After reservation: trip.availableSeats = 0 (seats were held)")
    void afterReservation_tripSeatsDecremented() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableSeats").value(0));
    }

    @Test
    @Order(3)
    @DisplayName("Duplicate reservation by same passenger → 409 RESERVATION_ALREADY_EXISTS")
    void createReservation_duplicate_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + client1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 1
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("RESERVATION_ALREADY_EXISTS"));
    }

    @Test
    @Order(4)
    @DisplayName("Over-booking: 0 seats remaining, CLIENT2 requests 1 → 409 TRIP_NO_SEATS_AVAILABLE")
    void createReservation_noSeatsAvailable_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + client2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 1
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("TRIP_NO_SEATS_AVAILABLE"));
    }

    @Test
    @Order(5)
    @DisplayName("DRIVER tries to reserve own trip → 403 (DRIVER role lacks CLIENT authority)")
    void createReservation_driverOwnTrip_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 1
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    @DisplayName("No token → 403 on protected endpoint")
    void createReservation_noToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 1
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(7)
    @DisplayName("Invalid request body (seatsReserved = 0) → 400 VALIDATION_ERROR")
    void createReservation_invalidBody_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + client2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 0
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(8)
    @DisplayName("DRIVER views trip reservations → 200, list contains CLIENT1's reservation")
    void getTripReservations_byDriver_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId + "/reservations")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(reservationId.toString()))
                .andExpect(jsonPath("$.data[0].passenger.email").value(CLIENT1_EMAIL))
                .andExpect(jsonPath("$.data[0].status").value("PENDING_PAYMENT"));
    }

    @Test
    @Order(9)
    @DisplayName("CLIENT1 tries to view trip reservations → 403 (only DRIVER/ADMIN allowed)")
    void getTripReservations_byClient_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId + "/reservations")
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(10)
    @DisplayName("CLIENT1 gets own reservation by ID → 200 with full detail")
    void getReservationById_byPassenger_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(reservationId.toString()))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.seatsReserved").value(2))
                .andExpect(jsonPath("$.data.passenger.email").value(CLIENT1_EMAIL));
    }

    @Test
    @Order(11)
    @DisplayName("DRIVER gets reservation on their trip by ID → 200")
    void getReservationById_byDriver_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(reservationId.toString()));
    }

    @Test
    @Order(12)
    @DisplayName("CLIENT2 tries to get CLIENT1's reservation → 403 ACCESS_DENIED")
    void getReservationById_byUnrelatedClient_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + client2Token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(13)
    @DisplayName("CLIENT1 lists own reservations → contains the PENDING_PAYMENT reservation")
    void getMyReservations_returnsOwnReservations() throws Exception {
        mockMvc.perform(get("/api/v1/reservations")
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[?(@.id == '" + reservationId + "')]").exists())
                .andExpect(jsonPath("$.data[?(@.id == '" + reservationId + "')].status",
                        hasItem("PENDING_PAYMENT")));
    }

    @Test
    @Order(14)
    @DisplayName("CLIENT1 cancels own reservation → 200, status = CANCELLED")
    void cancelReservation_byPassenger_returns200() throws Exception {
        mockMvc.perform(delete("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.id").value(reservationId.toString()));
    }

    @Test
    @Order(15)
    @DisplayName("After cancellation: trip.availableSeats = " + TRIP_SEATS + " (seats released)")
    void afterCancellation_tripSeatsRestored() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableSeats").value(TRIP_SEATS));
    }

    @Test
    @Order(16)
    @DisplayName("Cancel already-cancelled reservation → 403 OPERATION_NOT_PERMITTED")
    void cancelReservation_alreadyCancelled_returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + client1Token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("OPERATION_NOT_PERMITTED"));
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Registers a user via the auth endpoint and returns the JWT token.
     * Register now returns RegisterResponse (no token); email must be verified before login.
     */
    private String registerUser(String email, String firstName, String lastName, String role)
            throws Exception {
        // Register
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",     email,
                                "password",  PASSWORD,
                                "firstName", firstName,
                                "lastName",  lastName,
                                "role",      role
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

    /**
     * Looks up a User by email using the repository (bypasses HTTP).
     */
    private UUID userIdByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Setup failed: user not found — " + email))
                .getId();
    }

    /**
     * Extracts a value from an MvcResult's JSON body using a JsonPath expression.
     */
    private String extract(MvcResult result, String jsonPath) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), jsonPath).toString();
    }

    /**
     * Idempotent pre-cleanup: removes any leftover test data from a previously aborted run.
     * Deletes in FK order so no constraint violations occur.
     */
    private void cleanupIfExists() {
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver -> {
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(trip -> {
                        reservationRepository.findByTripId(trip.getId())
                                .forEach(r -> reservationRepository.deleteById(r.getId()));
                        tripRepository.deleteById(trip.getId());
                    });
            userRepository.delete(driver); // cascades: driver_profile, user_profile, vehicles
        });
        userRepository.findByEmail(CLIENT1_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT2_EMAIL).ifPresent(userRepository::delete);
    }
}
