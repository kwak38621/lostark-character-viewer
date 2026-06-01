# ── 1단계: Gradle로 JAR 빌드 ──────────────────────────
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# 의존성 캐싱: 빌드 스크립트 먼저 복사
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# 소스 복사 후 boot JAR 생성 (plain JAR 제외)
COPY src ./src
RUN ./gradlew bootJar --no-daemon

# ── 2단계: 경량 JRE로 실행 ────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app

# 빌드 산출물 중 boot JAR만 복사
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
# docker 프로파일 활성화 (환경변수에서 설정 읽음)
ENV SPRING_PROFILES_ACTIVE=docker
ENTRYPOINT ["java", "-jar", "app.jar"]
