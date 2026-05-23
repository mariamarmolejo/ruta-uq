package com.rutauq.backend.modules.chat.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.chat.config.GroqProperties;
import com.rutauq.backend.modules.chat.dto.ChatMessageRequest;
import com.rutauq.backend.modules.chat.dto.ChatRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class GroqChatService {

    private static final String SYSTEM_MESSAGE =
            "You are the assistant for Ruta Compartida UQ, a carpooling platform for Universidad del Quindio. " +
            "Answer briefly and clearly. Help users understand trips, reservations, payments, safety policies, " +
            "account support, and general platform usage. If you do not know something specific, say so and " +
            "suggest checking the relevant page or contacting support.";

    private final RestTemplate restTemplate;
    private final GroqProperties properties;

    public GroqChatService(
            @Qualifier("groqRestTemplate") RestTemplate restTemplate,
            GroqProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    public String sendMessage(ChatRequest request) {
        if (!StringUtils.hasText(properties.getApiKey())) {
            throw new AppException(ErrorCode.GROQ_ERROR, "Assistant is not configured.");
        }

        String url = properties.getApiBaseUrl() + "/chat/completions";
        GroqCompletionRequest groqRequest = new GroqCompletionRequest(
                properties.getModel(),
                buildMessages(request.getMessages()),
                0.4,
                500
        );

        try {
            ResponseEntity<GroqCompletionResponse> response =
                    restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(groqRequest), GroqCompletionResponse.class);

            String reply = response.getBody() == null ? null : response.getBody().firstReply();
            if (!StringUtils.hasText(reply)) {
                throw new AppException(ErrorCode.GROQ_ERROR, "Assistant returned an empty response.");
            }

            return reply.trim();
        } catch (HttpClientErrorException e) {
            log.warn("Groq client error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AppException(ErrorCode.GROQ_ERROR, "Assistant service is temporarily unavailable.", e);
        } catch (HttpServerErrorException e) {
            log.error("Groq server error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AppException(ErrorCode.GROQ_ERROR, "Assistant service is temporarily unavailable.", e);
        }
    }

    private List<GroqMessage> buildMessages(List<ChatMessageRequest> incomingMessages) {
        List<GroqMessage> messages = new ArrayList<>();
        messages.add(new GroqMessage("system", SYSTEM_MESSAGE));

        incomingMessages.forEach(message ->
                messages.add(new GroqMessage(message.getRole(), message.getContent().trim()))
        );

        return messages;
    }

    private record GroqCompletionRequest(
            String model,
            List<GroqMessage> messages,
            double temperature,
            int max_completion_tokens
    ) {
    }

    private record GroqMessage(String role, String content) {
    }

    private record GroqCompletionResponse(List<GroqChoice> choices) {
        private String firstReply() {
            if (choices == null || choices.isEmpty() || choices.get(0).message() == null) {
                return null;
            }

            return choices.get(0).message().content();
        }
    }

    private record GroqChoice(GroqResponseMessage message) {
    }

    private record GroqResponseMessage(String content) {
    }
}
