package com.rutauq.backend.modules.payments.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Returned to the frontend after creating a Checkout Pro preference. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceResponse {

    @JsonProperty("initPoint")
    private String initPoint;

    @JsonProperty("sandboxInitPoint")
    private String sandboxInitPoint;

    @JsonProperty("preferenceId")
    private String preferenceId;
}
