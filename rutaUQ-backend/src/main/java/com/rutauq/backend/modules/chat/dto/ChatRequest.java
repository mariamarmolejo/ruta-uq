package com.rutauq.backend.modules.chat.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {

    @Valid
    @NotEmpty(message = "messages are required")
    @Size(max = 12, message = "messages must not exceed 12 items")
    private List<ChatMessageRequest> messages;
}
