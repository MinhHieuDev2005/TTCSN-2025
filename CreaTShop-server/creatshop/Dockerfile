# Stage 1: Build ứng dụng bằng Maven
FROM maven:3.8.4-openjdk-17 AS build

WORKDIR /app

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Build ứng dụng và tạo file JAR
RUN mvn clean install

# Stage 2: Tạo image ứng dụng bằng OpenJDK
FROM openjdk:17-jdk-slim

WORKDIR /app

# Sao chép file .jar đã build từ stage trước
COPY --from=build /app/target/*.jar app.jar

# Expose cổng 8080
EXPOSE 8080

# Lệnh chạy ứng dụng Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]
