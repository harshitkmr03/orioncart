FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy sources and build the application
COPY pom.xml .
COPY src ./src
RUN mvn -B -Dmaven.test.skip=true clean package

FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy built jar from the build stage
COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 7070

ENTRYPOINT ["java","-jar","/app/app.jar"]
