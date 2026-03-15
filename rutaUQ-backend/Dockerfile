# =============================================================================
# RutaUQ Spring Boot backend
#
# Build the jar on the host first, then Docker packages it:
#   mvn package -DskipTests
#   docker build -t rutauq-backend .
#
# Run:
#   docker run -p 8080:8080 --env-file .env rutauq-backend
# =============================================================================

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Non-root user — running as root inside a container is a security risk
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the pre-built fat jar produced by: mvn package -DskipTests
COPY target/*.jar app.jar
RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

# JVM flags tuned for containers:
#   UseContainerSupport   — respects cgroup CPU/memory limits
#   MaxRAMPercentage=75.0 — 75% of container memory for heap
#   urandom               — faster SecureRandom seeding
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
