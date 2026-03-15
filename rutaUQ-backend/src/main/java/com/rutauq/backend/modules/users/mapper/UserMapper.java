package com.rutauq.backend.modules.users.mapper;

import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.users.domain.UserProfile;
import com.rutauq.backend.modules.users.dto.UserProfileResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "user.id",        target = "id")
    @Mapping(source = "user.email",     target = "email")
    @Mapping(source = "user.firstName", target = "firstName")
    @Mapping(source = "user.lastName",  target = "lastName")
    @Mapping(source = "user.phone",     target = "phone")
    @Mapping(source = "user.createdAt", target = "createdAt")
    @Mapping(expression = "java(user.getRole().name())", target = "role")
    @Mapping(source = "profile.bio",               target = "bio")
    @Mapping(source = "profile.avatarUrl",         target = "avatarUrl")
    @Mapping(source = "profile.birthDate",         target = "birthDate")
    @Mapping(source = "profile.privacyAccepted",   target = "privacyAccepted")
    @Mapping(source = "profile.privacyAcceptedAt", target = "privacyAcceptedAt")
    UserProfileResponse toResponse(User user, UserProfile profile);

    default UserProfileResponse toResponseWithoutProfile(User user) {
        UserProfile empty = new UserProfile();
        return toResponse(user, empty);
    }
}
