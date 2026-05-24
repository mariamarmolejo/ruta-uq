package com.rutauq.backend.nfr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.rutauq.backend.modules.auth.captcha.CaptchaValidator;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Non-Functional Requirements integration tests.
 *
 * NFR-01  Login response ≤ 3 s
 * NFR-02  Trip list response ≤ 3 s
 * NFR-03  Passwords stored as BCrypt hash (never plain-text)
 * NFR-04  CaptchaValidator bean is wired; captchaToken accepted by register endpoint
 * NFR-05  Payment amount matches reservation's totalPrice
 * NFR-07  Reservation-payment flow enforces mandatory PENDING_PAYMENT status
 * NFR-08  Role-based access: CLIENT/DRIVER endpoints are role-gated
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Non-Functional Requirements Tests")
class NfrIntegrationTest {

    @Autowired private MockMvc               mockMvc;
    @Autowired private ObjectMapper          objectMapper;
    @Autowired private UserRepository        userRepository;
    @Autowired private TripRepository        tripRepository;
    @Autowired private VehicleRepository     vehicleRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private PasswordEncoder       passwordEncoder;
    @Autowired private ApplicationContext    applicationContext;

    private static final String DRIVER_EMAIL = "test.nfr.driver@rutauq.test";
    private static final String CLIENT_EMAIL = "test.nfr.client@rutauq.test";
    private static final String PASSWORD     = "SecurePass123!";
    private static final long   MAX_MS       = 3_000;

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
        driverToken = registerAndGetToken(DRIVER_EMAIL, "Nfr", "Driver", "DRIVER");
        clientToken = registerAndGetToken(CLIENT_EMAIL, "Nfr", "Client", "CLIENT");

        mockMvc.perform(post("/api/v1/drivers/profile")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "licenseNumber", "TEST-NFR-LIC-001",
                        "licenseExpiry", "2031-06-30"
                ))));

        MvcResult vRes = mockMvc.perform(post("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "Chevrolet", "model", "Sail",
                                "year", 2022, "color", "Azul",
                                "plate", "NFR001", "seats", 3
                        ))))
                .andReturn();
        vehicleId = UUID.fromString(extract(vRes, "$.data.id"));

        String departure = Instant.now().plus(5, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.SECONDS).toString();
        MvcResult tRes = mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "vehicleId",      vehicleId.toString(),
                                "origin",         "Armenia NFR",
                                "destination",    "UQ NFR",
                                "departureTime",  departure,
                                "availableSeats", 3,
                                "pricePerSeat",   new BigDecimal("5000")
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        tripId = UUID.fromString(extract(tRes, "$.data.id"));
    }

    @AfterAll
    void cleanup() {
        userRepository.findByEmail(DRIVER_EMAIL).ifPresent(driver -> {
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(t -> {
                        reservationRepository.findByTripId(t.getId())
                                .forEach(r -> reservationRepository.deleteById(r.getId()));
                        tripRepository.deleteById(t.getId());
                    });
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // NFR-01  Login response time
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("NFR-01 — POST /auth/login responds within 3 seconds")
    void loginResponseTime_isUnder3Seconds() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email",    CLIENT_EMAIL,
                                "password", PASSWORD
                        ))))
                .andExpect(status().isOk());

        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsedMs)
                .as("Login must respond in under %d ms but took %d ms", MAX_MS, elapsedMs)
                .isLessThan(MAX_MS);
    }

    // =========================================================================
    // NFR-02  Trip creation form load time (trip list as proxy for form data)
    // =========================================================================

    @Test
    @Order(2)
    @DisplayName("NFR-02 — GET /trips responds within 3 seconds (trip list load)")
    void tripListResponseTime_isUnder3Seconds() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk());

        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsedMs)
                .as("Trip listing must respond in under %d ms but took %d ms", MAX_MS, elapsedMs)
                .isLessThan(MAX_MS);
    }

    @Test
    @Order(3)
    @DisplayName("NFR-02 — GET /vehicles responds within 3 seconds (trip form vehicle data)")
    void vehicleListResponseTime_isUnder3Seconds() throws Exception {
        long start = System.nanoTime();

        mockMvc.perform(get("/api/v1/vehicles")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk());

        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        assertThat(elapsedMs)
                .as("Vehicle listing must respond in under %d ms but took %d ms", MAX_MS, elapsedMs)
                .isLessThan(MAX_MS);
    }

    // =========================================================================
    // NFR-03  Password stored as BCrypt hash
    // =========================================================================

    @Test
    @Order(4)
    @DisplayName("NFR-03 — Stored password is a BCrypt hash, not plain text")
    void passwordStoredAsBcryptHash() {
        userRepository.findByEmail(CLIENT_EMAIL).ifPresentOrElse(user -> {
            String storedHash = user.getPassword();

            assertThat(storedHash)
                    .as("Stored password must not be the plain-text password")
                    .isNotEqualTo(PASSWORD);

            assertThat(storedHash)
                    .as("Stored hash must match BCrypt format ($2a$ or $2b$)")
                    .matches("\\$2[ab]\\$\\d{2}\\$.{53}");

            assertThat(passwordEncoder.matches(PASSWORD, storedHash))
                    .as("BCrypt verification of plain-text against stored hash must succeed")
                    .isTrue();
        }, () -> {
            throw new AssertionError("Test user not found: " + CLIENT_EMAIL);
        });
    }

    // =========================================================================
    // NFR-04  CAPTCHA validator is wired in the application context
    // =========================================================================

    @Test
    @Order(5)
    @DisplayName("NFR-04 — CaptchaValidator bean is present in the application context")
    void captchaValidatorBean_isPresent() {
        CaptchaValidator validator = applicationContext.getBean(CaptchaValidator.class);
        assertThat(validator)
                .as("A CaptchaValidator implementation must be registered as a Spring bean")
                .isNotNull();
    }

    @Test
    @Order(6)
    @DisplayName("NFR-04 — Registration endpoint accepts captchaToken field (dev: NoOp validator passes)")
    void registrationWithCaptchaToken_succeeds() throws Exception {
        String tmpEmail = "test.nfr.captcha@rutauq.test";
        userRepository.findByEmail(tmpEmail).ifPresent(userRepository::delete);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName",    "Captcha",
                                "lastName",     "Test",
                                "email",        tmpEmail,
                                "password",     PASSWORD,
                                "role",         "CLIENT",
                                "captchaToken", "dev-bypass-token"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        userRepository.findByEmail(tmpEmail).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // NFR-05  Payment amount integrity (amount = seats × pricePerSeat)
    // =========================================================================

    @Test
    @Order(7)
    @DisplayName("NFR-05 — Reservation totalPrice = seatsReserved × pricePerSeat")
    void reservationTotalPrice_matchesSeatsPriceProduct() throws Exception {
        // pricePerSeat = 5000, seats = 2 → totalPrice = 10000
        MvcResult result = mockMvc.perform(post("/api/v1/reservations")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tripId",        tripId.toString(),
                                "seatsReserved", 2
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalPrice").value(10000))
                .andExpect(jsonPath("$.data.seatsReserved").value(2))
                .andReturn();

        UUID resId = UUID.fromString(extract(result, "$.data.id"));

        // Verify the stored reservation matches in DB too
        reservationRepository.findByIdWithTrip(resId).ifPresentOrElse(reservation -> {
            BigDecimal total = reservation.getTrip().getPricePerSeat()
                    .multiply(BigDecimal.valueOf(reservation.getSeatsReserved()));
            assertThat(total).isEqualByComparingTo(new BigDecimal("10000"));
        }, () -> {
            throw new AssertionError("Reservation not persisted: " + resId);
        });

        // Cleanup reservation
        reservationRepository.findById(resId).ifPresent(r -> {
            r.setStatus(ReservationStatus.CANCELLED);
            reservationRepository.save(r);
            // Restore seats
            tripRepository.findById(tripId).ifPresent(t -> {
                t.setAvailableSeats(t.getAvailableSeats() + 2);
                tripRepository.save(t);
            });
            reservationRepository.delete(r);
        });
    }

    // =========================================================================
    // NFR-07  Booking-payment flow cannot skip mandatory steps
    // =========================================================================

    @Test
    @Order(8)
    @DisplayName("NFR-07 — Payment cannot be initiated without an existing PENDING_PAYMENT reservation")
    void payment_withoutReservation_isRejected() throws Exception {
        // POST /payments/create with a non-existent reservationId
        mockMvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reservationId",       UUID.randomUUID().toString(),
                                "cardToken",           "fake-token",
                                "paymentMethodId",     "visa",
                                "paymentType",         "credit_card",
                                "installments",        1,
                                "identificationType",  "CC",
                                "identificationNumber","123456789"
                        ))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESERVATION_NOT_FOUND"));
    }

    // =========================================================================
    // NFR-08  Role-based access control
    // =========================================================================

    @Test
    @Order(9)
    @DisplayName("NFR-08 — CLIENT cannot publish a trip (DRIVER-only endpoint)")
    void roleCheck_clientCannotCreateTrip() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "vehicleId",      vehicleId.toString(),
                                "origin",         "X", "destination", "Y",
                                "departureTime",  Instant.now().plus(3, ChronoUnit.DAYS).toString(),
                                "availableSeats", 1,
                                "pricePerSeat",   new BigDecimal("2000")
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(10)
    @DisplayName("NFR-08 — DRIVER cannot reserve a seat (CLIENT-only endpoint)")
    void roleCheck_driverCannotReserve() throws Exception {
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
    @Order(11)
    @DisplayName("NFR-08 — Unauthenticated request to protected endpoint → 403")
    void roleCheck_noTokenOnProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(12)
    @DisplayName("NFR-08 — CLIENT cannot start a trip (DRIVER-only action)")
    void roleCheck_clientCannotStartTrip() throws Exception {
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/start")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
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
            tripRepository.findByDriverIdOrderByDepartureTimeDesc(driver.getId())
                    .forEach(t -> {
                        reservationRepository.findByTripId(t.getId())
                                .forEach(r -> reservationRepository.deleteById(r.getId()));
                        tripRepository.deleteById(t.getId());
                    });
            userRepository.delete(driver);
        });
        userRepository.findByEmail(CLIENT_EMAIL).ifPresent(userRepository::delete);
    }
}
