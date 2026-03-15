package com.rutauq.backend.modules.auth.repository;

import com.rutauq.backend.modules.auth.domain.EmailToken;
import com.rutauq.backend.modules.auth.domain.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailTokenRepository extends JpaRepository<EmailToken, UUID> {

    Optional<EmailToken> findByToken(String token);

    void deleteByUserIdAndType(UUID userId, TokenType type);
}
