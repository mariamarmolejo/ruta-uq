package com.rutauq.backend.health;

import com.rutauq.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Platform health and status check")
public class HealthController {

    @Value("${app.name:Ruta Compartida UQ}")
    private String appName;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @GetMapping
    @Operation(
            summary = "Health check",
            description = "Returns the current status of the API and basic platform metadata"
    )
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> payload = Map.of(
                "platform", appName,
                "version", appVersion,
                "status", "UP",
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.ok("Platform is running", payload));
    }
}
