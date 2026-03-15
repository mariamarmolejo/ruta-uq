package com.rutauq.backend.modules.auth.email;

public interface EmailSender {
    void send(String to, String subject, String body);
}
