package com.rutauq.backend.modules.trips;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
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

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests — Trip lifecycle (Phase 7).
 *
 * Covers BF-12 (start trip), BF-14 (status transitions),
 * BF-16 (complete trip), BF-17 (trip history).
 *
 * Note on BF-13 (boarding confirmation): there is no explicit "board passenger"
 * HTTP endpoint. Boarding is represented by the CONFIRMED reservation status
 * (set by the payment webhook) and the trip being IN_PROGRESS. When a trip is
 * completed, all CONFIRMED reservations transition to COMPLETED automatically.
 * This behaviour is exercised in the completeTrip → reservations=COMPLETED assertions.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Trip Tracking — Start / Complete / History Integration Tests")
class TripTrackingIntegrationTest {

    @Autowired private MockMvc              mockMvc;
    @Autowired private ObjectMapper         objectMapper;
    @Autowired private UserRepository       userRepository;
    @Autowired private TripRepository       tripRepository;
    @Autowired private VehicleRepository    vehicleRepository;
    @Autowired private ReservationRepository reservationRepository;

    private static final String DRIVER_EMAIL  = "test.tracking.driver@rutauq.test";
    private static final String CLIENT_EMAIL  = "test.tracking.client@rutauq.test";
    private static final String PASSWORD      = "SecurePass123!";

    private String driverToken;
    private String clientToken;
    private UUID   vehicleId;
    private UUID   tripId;
    private UUID   reservationId;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        cleanupIfExists();
        driverToken = registerAndGetToken(DRIVER_EMAIL, "Track", "Driver", "DRIVER");
        clientToken = registerAndGetToken(CLIENT_EMAIL, "Track", "Client", "CLIENT");

        mockMvc.perform(post("/api/v1/drivers/profile")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "licenseNumber", "TEST-TRK-LIC-001",
                        "licenseExpiry", "2031-06-30"
                ))));

        MvcResult vRes = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "Toyota", "model", "Yaris",
                                "year", 2023, "color", "Rojo",
                                "plate", "TRK001", "seats", 3
                        ))))
                .andReturn();
        vehicleId = UUID.fromString(extract(vRes, "$.data.id"));

        MvcResult tRes = mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripBody()))
                .andExpect(status().isCreated())
                .andReturn();
        tripId = UUID.fromString(extract(tRes, "$.data.id"));

        // Passenger reserves a seat
        MvcResult rRes = mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 1
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        reservationId = UUID.fromString(extract(rRes, "$.data.id"));

        // Simulate payment approval: set reservation to CONFIRMED directly
        reservationRepository.findById(reservationId).ifPresent(r -> {
            r.setStatus(ReservationStatus.CONFIRMED);
            reservationRepository.save(r);
        });
    }

    @AfterAll
    void cleanup() {
        reservationRepository.findById(reservationId).ifPresent(reservationRepository::delete);
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver -> {
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(t -> tripRepository.deleteById(t.getId()));
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // BF-12  Start trip
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("BF-12 — CLIENT cannot start a trip → 403")
    void startTrip_clientRole_returns403() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/start")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    @DisplayName("BF-12 — DRIVER starts SCHEDULED trip → 200, status = IN_PROGRESS")
    void startTrip_driver_returns200() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/start")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.id").value(tripId.toString()));
    }

    // =========================================================================
    // BF-14  Status transitions — invalid moves
    // =========================================================================

    @Test
    @Order(3)
    @DisplayName("BF-14 — DRIVER cannot start an already IN_PROGRESS trip → 409 TRIP_INVALID_STATUS")
    void startTrip_alreadyInProgress_returns409() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/start")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("TRIP_INVALID_STATUS"));
    }

    @Test
    @Order(4)
    @DisplayName("BF-14 — GET /trips/{id} shows updated status IN_PROGRESS")
    void getTripById_showsInProgressStatus() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
    }

    // =========================================================================
    // BF-13  Boarding confirmation (CONFIRMED reservation = passenger boarded)
    // =========================================================================

    @Test
    @Order(5)
    @DisplayName("BF-13 — CONFIRMED reservation visible on the IN_PROGRESS trip")
    void boardingConfirmation_confirmedReservationLinkedToInProgressTrip() throws Exception {
        mockMvc.perform(get("/api/v1/trips/" + tripId + "/reservations")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + reservationId + "')].status",
                        hasItem("CONFIRMED")));
    }

    // =========================================================================
    // BF-16  Complete trip
    // =========================================================================

    @Test
    @Order(6)
    @DisplayName("BF-16 — CLIENT cannot complete a trip → 403")
    void completeTrip_clientRole_returns403() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(7)
    @DisplayName("BF-16 — DRIVER completes IN_PROGRESS trip → 200, status = COMPLETED")
    void completeTrip_driver_returns200() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.id").value(tripId.toString()));
    }

    @Test
    @Order(8)
    @DisplayName("BF-16 — CONFIRMED reservation transitions to COMPLETED after trip completes")
    void completeTrip_confirmedReservationBecomesCompleted() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/" + reservationId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    @Order(9)
    @DisplayName("BF-14 — Cannot complete an already COMPLETED trip → 409 TRIP_INVALID_STATUS")
    void completeTrip_alreadyCompleted_returns409() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("TRIP_INVALID_STATUS"));
    }

    // =========================================================================
    // BF-17  Trip history
    // =========================================================================

    @Test
    @Order(10)
    @DisplayName("BF-17 — GET /trips/my includes COMPLETED trip in driver's history")
    void tripHistory_containsCompletedTrip() throws Exception {
        mockMvc.perform(get("/api/v1/trips/my")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").exists())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')].status",
                        hasItem("COMPLETED")));
    }

    @Test
    @Order(11)
    @DisplayName("BF-17 — COMPLETED trip does NOT appear in public SCHEDULED trip listing")
    void completedTrip_notVisibleInPublicListing() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + tripId + "')]").doesNotExist());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String tripBody() throws Exception {
        String departure = Instant.now().plus(1, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();
        return objectMapper.writeValueAsString(Map.of(
                "vehicleId",      vehicleId.toString(),
                "origin",         "Armenia Tracking",
                "destination",    "UQ Tracking",
                "departureTime",  departure,
                "availableSeats", 3,
                "pricePerSeat",   new BigDecimal("5000")
        ));
    }

    private String registerAndGetToken(String email, String firstName, String lastName, String role)
            throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", PASSWORD,
                                "firstName", firstName, "lastName", lastName, "role", role
                        ))))
                .andExpect(status().isCreated());

        userRepository.findByEmail(email).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });

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
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId()).forEach(t -> {
                reservationRepository.findByTripId(t.getId())
                        .forEach(r -> reservationRepository.deleteById(r.getId()));
                tripRepository.deleteById(t.getId());
            });
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }
}
