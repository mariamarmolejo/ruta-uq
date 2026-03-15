package com.rutauq.backend.modules.auth.domain;

public enum Role {
    CLIENT,
    DRIVER,
    ADMIN;

    public String getAuthority() {
        return "ROLE_" + name();
    }
}
