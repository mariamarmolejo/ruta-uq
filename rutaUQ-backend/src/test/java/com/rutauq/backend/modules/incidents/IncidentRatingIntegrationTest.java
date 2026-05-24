package com.rutauq.backend.modules.incidents;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.incidents.repository.IncidentRepository;
import com.rutauq.backend.modules.ratings.repository.RatingRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for incidents (BF-15) and ratings (BF-18).
 *
 * Data setup:
 *  - Driver, vehicle, trip + Client reservation
 *  - Reservation is set to COMPLETED via repo (bypasses payment/trip lifecycle)
 *    so that both incident and rating flows can be tested independently.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("BF-15 Incidents & BF-18 Ratings — Integration Tests")
class IncidentRatingIntegrationTest {

    @Autowired private MockMvc               mockMvc;
    @Autowired private ObjectMapper          objectMapper;
    @Autowired private UserRepository        userRepository;
    @Autowired private TripRepository        tripRepository;
    @Autowired private VehicleRepository     vehicleRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private IncidentRepository    incidentRepository;
    @Autowired private RatingRepository      ratingRepository;

    private static final String DRIVER_EMAIL  = "test.ir.driver@rutauq.test";
    private static final String CLIENT_EMAIL  = "test.ir.client@rutauq.test";
    private static final String CLIENT2_EMAIL = "test.ir.client2@rutauq.test";
    private static final String PASSWORD      = "SecurePass123!";

    private String driverToken;
    private String clientToken;
    private String client2Token;
    private UUID   tripId;
    private UUID   reservationId;

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @BeforeAll
    void setup() throws Exception {
        cleanupIfExists();

        driverToken = registerAndGetToken(DRIVER_EMAIL, "IR",  "Driver",  "DRIVER");
        clientToken = registerAndGetToken(CLIENT_EMAIL, "IR",  "Client1", "CLIENT");
        client2Token = registerAndGetToken(CLIENT2_EMAIL, "IR", "Client2", "CLIENT");

        mockMvc.perform(post("/api/v1/drivers/profile")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "licenseNumber", "TEST-IR-LIC-001",
                        "licenseExpiry", "2031-06-30"
                ))));

        MvcResult vRes = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "Renault", "model", "Logan",
                                "year", 2021, "color", "Blanco",
                                "plate", "IR001", "seats", 3
                        ))))
                .andReturn();
        UUID vehicleId = UUID.fromString(extract(vRes, "$.data.id"));

        String departure = Instant.now().plus(2, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();
        MvcResult tRes = mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "vehicleId",      vehicleId.toString(),
                                "origin",         "Armenia IR",
                                "destination",    "UQ IR",
                                "departureTime",  departure,
                                "availableSeats", 3,
                                "pricePerSeat",   new BigDecimal("4000")
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        tripId = UUID.fromString(extract(tRes, "$.data.id"));

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

        // Set reservation to COMPLETED so both incidents and ratings can be tested
        reservationRepository.findById(reservationId).ifPresent(r -> {
            r.setStatus(ReservationStatus.COMPLETED);
            reservationRepository.save(r);
        });
    }

    @AfterAll
    void cleanup() {
        // Incidents and ratings are cascade-deleted with reservations
        reservationRepository.findById(reservationId).ifPresent(r -> {
            incidentRepository.findFirstByReservationId(reservationId).ifPresent(incidentRepository::delete);
            ratingRepository.findByReservationId(reservationId).ifPresent(ratingRepository::delete);
            reservationRepository.delete(r);
        });
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver -> {
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(t -> tripRepository.deleteById(t.getId()));
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT2_EMAIL).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // BF-15  Incident reporting
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("BF-15 — CLIENT reports an incident on own reservation → 201 with description")
    void reportIncident_success() throws Exception {
        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", reservationId.toString(),
                                "description",   "Conductor frenó de golpe en la autopista."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reservationId").value(reservationId.toString()))
                .andExpect(jsonPath("$.data.description").value("Conductor frenó de golpe en la autopista."))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andDo(print());
    }

    @Test
    @Order(2)
    @DisplayName("BF-15 — Incident without description → 400 VALIDATION_ERROR")
    void reportIncident_missingDescription_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", reservationId.toString(),
                                "description",   ""
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andDo(print());
    }

    @Test
    @Order(3)
    @DisplayName("BF-15 — CLIENT2 cannot report incident on CLIENT1's reservation → 403")
    void reportIncident_wrongPassenger_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + client2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", reservationId.toString(),
                                "description",   "Intento de fraude"
                        ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
                .andDo(print());
    }

    @Test
    @Order(4)
    @DisplayName("BF-15 — Incident not found for unknown reservation → 404")
    void getIncident_unknownReservation_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/incidents/reservation/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("INCIDENT_NOT_FOUND"))
                .andDo(print());
    }

    @Test
    @Order(5)
    @DisplayName("BF-15 — GET incident by reservation returns the reported incident")
    void getIncident_byReservation_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/incidents/reservation/" + reservationId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationId").value(reservationId.toString()))
                .andExpect(jsonPath("$.data.description").isNotEmpty())
                .andDo(print());
    }

    // =========================================================================
    // BF-18  Service rating
    // =========================================================================

    @Test
    @Order(6)
    @DisplayName("BF-18 — CLIENT rates COMPLETED reservation → 201, stars and comment stored")
    void rateTrip_success() throws Exception {
        mockMvc.perform(post("/api/v1/ratings")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", reservationId.toString(),
                                "stars",         4,
                                "comment",       "Buen conductor, viaje cómodo."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.stars").value(4))
                .andExpect(jsonPath("$.data.comment").value("Buen conductor, viaje cómodo."))
                .andExpect(jsonPath("$.data.reservationId").value(reservationId.toString()))
                .andDo(print());
    }

    @Test
    @Order(7)
    @DisplayName("BF-18 — Duplicate rating on same reservation → 409 RATING_ALREADY_EXISTS")
    void rateTrip_duplicate_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/ratings")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", reservationId.toString(),
                                "stars",         5,
                                "comment",       "Segundo intento"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("RATING_ALREADY_EXISTS"))
                .andDo(print());
    }

    @Test
    @Order(8)
    @DisplayName("BF-18 — Stars out of range (6) → 400 VALIDATION_ERROR")
    void rateTrip_starsOutOfRange_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ratings")
                        .header("Authorization", "Bearer " + client2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId", UUID.randomUUID().toString(),
                                "stars",         6
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andDo(print());
    }

    @Test
    @Order(9)
    @DisplayName("BF-18 — GET rating by reservation returns stored rating")
    void getRating_byReservation_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/ratings/reservation/" + reservationId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stars").value(4))
                .andExpect(jsonPath("$.data.comment").value("Buen conductor, viaje cómodo."))
                .andDo(print());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

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
                reservationRepository.findByTripId(t.getId()).forEach(r -> {
                    incidentRepository.findFirstByReservationId(r.getId()).ifPresent(incidentRepository::delete);
                    ratingRepository.findByReservationId(r.getId()).ifPresent(ratingRepository::delete);
                    reservationRepository.deleteById(r.getId());
                });
                tripRepository.deleteById(t.getId());
            });
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(CLIENT2_EMAIL).ifPresent(userRepository::delete);
    }
}
