package com.rutauq.backend.modules.chat.controller;

import com.rutauq.backend.common.response.ApiResponse;
import com.rutauq.backend.modules.chat.dto.ChatRequest;
import com.rutauq.backend.modules.chat.dto.ChatResponse;
import com.rutauq.backend.modules.chat.service.GroqChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Groq-powered assistant")
public class ChatController {

    private final GroqChatService groqChatService;

    @PostMapping
    @Operation(summary = "Ask the assistant", description = "Returns a brief assistant response for Ruta Compartida UQ users.")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(new ChatResponse(groqChatService.sendMessage(request))));
    }
}
