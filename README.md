# Overseer
<p ='center'>
<img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white">
<img alt="" src="https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=white">
<img src="https://img.shields.io/badge/Maven-C71A36?logo=apachemaven&logoColor=white">
<img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black">
<img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white">
<img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white">
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
</p>

---
This is a bachelors project. Stay tuned.

---

Spring Boot backend (Java)

In addition to the original Django REST Framework backend, a minimal Spring Boot backend is provided to serve the same authentication endpoint for migration purposes.

How to run the Spring Boot backend:
- Prerequisites: Java 21+ and Maven 3.9+
- Navigate to overseer-backend-spring
- Run: mvn spring-boot:run

Endpoint parity:
- GET http://localhost:8080/api/auth returns { "message": "Authentication endpoint is working!" }