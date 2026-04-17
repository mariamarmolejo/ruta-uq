package com.rutauq.backend.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Generic
    INTERNAL_SERVER_ERROR("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    VALIDATION_ERROR("Input validation failed", HttpStatus.BAD_REQUEST),
    RESOURCE_NOT_FOUND("The requested resource was not found", HttpStatus.NOT_FOUND),
    RESOURCE_ALREADY_EXISTS("The resource already exists", HttpStatus.CONFLICT),
    OPERATION_NOT_PERMITTED("This operation is not permitted", HttpStatus.FORBIDDEN),

    // Auth (reserved for Phase 2)
    INVALID_CREDENTIALS("Invalid username or password", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("Authentication token has expired", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID("Authentication token is invalid", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("You do not have permission to access this resource", HttpStatus.FORBIDDEN),

    // User (reserved for Phase 3)
    USER_NOT_FOUND("User not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_EXISTS("A user with this email already exists", HttpStatus.CONFLICT),
    USER_DISABLED("This user account is disabled", HttpStatus.FORBIDDEN),
    EMAIL_NOT_VERIFIED("Email not verified. Please check your inbox.", HttpStatus.FORBIDDEN),

    // Trip (reserved for Phase 4)
    TRIP_NOT_FOUND("Trip not found", HttpStatus.NOT_FOUND),
    TRIP_ALREADY_CLOSED("This trip is no longer accepting reservations", HttpStatus.CONFLICT),
    TRIP_NO_SEATS_AVAILABLE("No seats available on this trip", HttpStatus.CONFLICT),
    TRIP_INVALID_STATUS("This action is not allowed for the current trip status", HttpStatus.CONFLICT),

    // Reservation (reserved for Phase 5)
    RESERVATION_NOT_FOUND("Reservation not found", HttpStatus.NOT_FOUND),
    RESERVATION_ALREADY_EXISTS("You already have a reservation for this trip", HttpStatus.CONFLICT),

    // Payment (Phase 6)
    PAYMENT_FAILED("Payment processing failed", HttpStatus.PAYMENT_REQUIRED),
    PAYMENT_NOT_FOUND("Payment record not found", HttpStatus.NOT_FOUND),
    PAYMENT_INVALID_STATUS("Cannot process payment in the current reservation status", HttpStatus.CONFLICT),
    MERCADO_PAGO_ERROR("Mercado Pago API returned an error", HttpStatus.BAD_GATEWAY),

    // Google OAuth (Phase Google)
    GOOGLE_TOKEN_INVALID("Google ID token is invalid or expired", HttpStatus.UNAUTHORIZED);

    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ErrorCode(String defaultMessage, HttpStatus httpStatus) {
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}
