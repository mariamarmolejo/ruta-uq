package com.rutauq.backend.modules.trips.repository;

import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.domain.TripStatus;
import com.rutauq.backend.modules.trips.dto.TripFilter;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public class TripSpecification {

    private TripSpecification() {}

    public static Specification<Trip> withFilter(TripFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always show only SCHEDULED trips in public listing
            predicates.add(cb.equal(root.get("status"), TripStatus.SCHEDULED));

            // Only future trips
            predicates.add(cb.greaterThan(root.get("departureTime"), Instant.now()));

            if (filter.getOrigin() != null && !filter.getOrigin().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("origin")),
                        "%" + filter.getOrigin().toLowerCase().trim() + "%"
                ));
            }

            if (filter.getDestination() != null && !filter.getDestination().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("destination")),
                        "%" + filter.getDestination().toLowerCase().trim() + "%"
                ));
            }

            if (filter.getDepartureDate() != null) {
                Instant startOfDay = filter.getDepartureDate()
                        .atStartOfDay(ZoneOffset.UTC).toInstant();
                Instant endOfDay = filter.getDepartureDate()
                        .plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
                predicates.add(cb.between(root.get("departureTime"), startOfDay, endOfDay));
            }

            if (filter.getMinSeats() != null && filter.getMinSeats() > 0) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("availableSeats"), filter.getMinSeats()
                ));
            }

            // Eager fetch driver and vehicle to avoid N+1
            root.fetch("driver");
            root.fetch("vehicle");

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
