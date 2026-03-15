package com.rutauq.backend.modules.drivers.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.drivers.domain.DriverProfile;
import com.rutauq.backend.modules.drivers.dto.DriverProfileRequest;
import com.rutauq.backend.modules.drivers.dto.DriverProfileResponse;
import com.rutauq.backend.modules.drivers.repository.DriverProfileRepository;
import com.rutauq.backend.modules.vehicles.mapper.VehicleMapper;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleMapper vehicleMapper;

    @Transactional
    public DriverProfileResponse createProfile(User user, DriverProfileRequest request) {
        if (user.getRole() != Role.DRIVER) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "Only users with DRIVER role can create a driver profile");
        }
        if (driverProfileRepository.existsByUserId(user.getId())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS, "Driver profile already exists");
        }
        if (driverProfileRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "License number '" + request.getLicenseNumber() + "' is already registered");
        }

        // Load user in current persistence context to avoid "detached entity passed to persist"
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        DriverProfile profile = DriverProfile.builder()
                .user(managedUser)
                .licenseNumber(request.getLicenseNumber().toUpperCase())
                .licenseExpiry(request.getLicenseExpiry())
                .build();

        driverProfileRepository.save(profile);
        log.info("Driver profile created for user {}", managedUser.getEmail());
        return buildResponse(managedUser, profile);
    }

    @Transactional(readOnly = true)
    public DriverProfileResponse getMyProfile(User user) {
        DriverProfile profile = driverProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Driver profile not found. Please create one first."));
        return buildResponse(user, profile);
    }

    @Transactional
    public DriverProfileResponse updateProfile(User user, DriverProfileRequest request) {
        DriverProfile profile = driverProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Driver profile not found. Please create one first."));

        boolean licenseChanged = !profile.getLicenseNumber().equals(request.getLicenseNumber().toUpperCase());
        if (licenseChanged && driverProfileRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "License number '" + request.getLicenseNumber() + "' is already registered");
        }

        profile.setLicenseNumber(request.getLicenseNumber().toUpperCase());
        profile.setLicenseExpiry(request.getLicenseExpiry());
        driverProfileRepository.save(profile);

        return buildResponse(user, profile);
    }

    private DriverProfileResponse buildResponse(User user, DriverProfile profile) {
        return DriverProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .licenseNumber(profile.getLicenseNumber())
                .licenseExpiry(profile.getLicenseExpiry())
                .verified(profile.isVerified())
                .rating(profile.getRating())
                .totalTrips(profile.getTotalTrips())
                .vehicles(vehicleMapper.toResponseList(
                        vehicleRepository.findByDriverIdAndActiveTrue(user.getId())
                ))
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
