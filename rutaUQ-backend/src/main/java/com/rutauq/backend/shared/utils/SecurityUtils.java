package com.rutauq.backend.shared.utils;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    /**
     * Returns the currently authenticated User from the SecurityContext.
     * Throws ACCESS_DENIED if called outside an authenticated request.
     */
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        return (User) auth.getPrincipal();
    }
}
