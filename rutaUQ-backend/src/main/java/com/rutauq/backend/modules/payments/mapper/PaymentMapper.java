package com.rutauq.backend.modules.payments.mapper;

import com.rutauq.backend.modules.payments.domain.Payment;
import com.rutauq.backend.modules.payments.dto.PaymentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "reservationId", source = "reservation.id")
    PaymentResponse toResponse(Payment payment);

    List<PaymentResponse> toResponseList(List<Payment> payments);
}
