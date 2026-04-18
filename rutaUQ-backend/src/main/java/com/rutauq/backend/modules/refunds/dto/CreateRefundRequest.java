package com.rutauq.backend.modules.refunds.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateRefundRequest {

    @NotNull(message = "reservationId is required")
    private UUID reservationId;
}
