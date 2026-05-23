package com.rutauq.backend.modules.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatMessageRequest {

    @NotBlank(message = "role is required")
    @Pattern(regexp = "user|assistant", message = "role must be user or assistant")
    private String role;

    @NotBlank(message = "content is required")
    @Size(max = 2000, message = "content must not exceed 2000 characters")
    private String content;
}
