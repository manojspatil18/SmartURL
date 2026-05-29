# ===================================================================
# STAGE 1: Build the Spring Boot Application
# ===================================================================
FROM maven:3.8.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and stage dependency downloads
COPY pom.xml .
# Copy all source files
COPY src ./src

# Compile and package the Java JAR file, skipping unit tests for speed
RUN mvn clean package -DskipTests

# ===================================================================
# STAGE 2: Run the compiled JAR in a lightweight JRE
# ===================================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the compiled JAR file from the builder stage
COPY --from=build /app/target/url-shortener-1.0.0.jar app.jar

# Expose standard web server port
EXPOSE 8080

# Launch the Spring Boot Web Server
ENTRYPOINT ["java", "-jar", "app.jar"]
