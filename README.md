# Overseer
<p align='center'>
  <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white">
  <img alt="" src="https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=white">
  <img src="https://img.shields.io/badge/Maven-C71A36?logo=apachemaven&logoColor=white">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white">
  <img src="https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
</p>

---
A version control system and social network for designers — manage, store, and publish design projects with a visually appealing interface. Designers can track project history, collaborate, and explore work from others in a comfortable, structured environment.

---

## Architecture

Overseer is composed of four services orchestrated with Docker Compose:

| Service | Tech | Port | Purpose |
|---|---|---|---|
| `overseer-backend` | Spring Boot (Java 21) | 8080 | REST API, auth, database |
| `overseer-frontend` | React + Vite + Tailwind | 5173 | Web client |
| `overseer-desktop` | Electron + React | — | Desktop app for pushing commits |
| `overseer-pixeldiff` | FastAPI + Python | 8001 | SSIM-based pixel diff microservice |

**Storage:** PostgreSQL (via JPA) + Azurite (Azure Blob Storage emulator for local dev)

**Auth:** Google OAuth2 → JWT

```mermaid
graph TD
    subgraph Client
        FE["overseer-frontend\nReact + Vite · :5173"]
        DE["overseer-desktop\nElectron + React"]
    end

    subgraph Services
        BE["overseer-backend\nSpring Boot · :8080"]
        PD["overseer-pixeldiff\nFastAPI · :8001"]
    end

    subgraph Storage
        PG[(PostgreSQL\n:5432)]
        AZ[(Azurite\nBlob Storage · :10000)]
    end

    subgraph Auth
        GO["Google OAuth2"]
    end

    FE -- "REST /api/**" --> BE
    FE -- "POST /diff" --> PD
    DE -- "REST /api/**\npush commits" --> BE
    DE -- "blob upload" --> AZ
    BE -- "JPA" --> PG
    BE -- "blob read/write" --> AZ
    BE -- "OAuth2 redirect" --> GO
    GO -- "callback + JWT" --> BE
```

---

## Features

- **Google OAuth2 + JWT authentication** — secure sign-in, protected routes, auth callback flow
- **Projects** — create, edit, and publish design projects with tags, visibility settings, and README
- **Sheets & files** — version-controlled file uploads organized into sheets per project
- **Profile** — editable Identity / Links / Skills sections, tag picker for skills, follow/unfollow users
- **Explore** — browse public projects from all users
- **Dashboard** — welcome banner with quick access to your recent projects
- **Pixel diff** — FastAPI microservice using SSIM perceptual diff to compare image versions
- **Desktop app** — Electron client dedicated to pushing project commits (web client is read-only for commits)
- **GitHub Actions CI** — three parallel jobs: frontend lint+build, backend compile, pixeldiff syntax check

### Design system
Consistent color palette applied site-wide: blue `#60a5fa` · violet `#a78bfa` · pink `#f472b6` · green `#34d399`

### User path

```mermaid
journey
    title Overseer — User Flow
    section Discovery
      Visit landing page:        5: Visitor
      Browse Explore page:       4: Visitor
      View a public project:     4: Visitor
    section Onboarding
      Sign in with Google:       5: User
      Redirected to Dashboard:   5: User
    section Creating
      Create a new project:      5: User
      Add tags and visibility:   4: User
      Push files via Desktop app: 4: User
    section Collaborating
      View another user profile: 5: User
      Follow a designer:         5: User
      Explore their projects:    4: User
    section Managing
      Edit project details:      4: User
      Update profile / skills:   4: User
      Compare versions (diff):   3: User
```

---

## Changelog

| Version | Date       | Changes                                                                                                                                                                                                                                                                  |
|---------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0.1.0   | 2026-03-18 | Spring Boot backend (Java 21) with Google OAuth2 + JWT auth, REST endpoints for users/projects/sheets/files, PostgreSQL via JPA, Swagger UI with Bearer token support, Docker Compose with PostgreSQL service, React + Vite frontend scaffold, Electron desktop scaffold |
| 0.1.1   | 2026-04-04 | React + Tailwind frontend, Azurite for local blob storage                                                                                                                                                                                                               |
| 0.1.2   | 2026-04-07 | Full authentication flow (Google OAuth2 callback, JWT context, protected routes), all main pages (Landing, Dashboard, Explore, Profile, Project, NewProject, Settings, NotFound), API client layer, ProjectCard component, Navbar                                        |
| 0.1.3   | 2026-04-08 | FastAPI pixel diff microservice (SSIM) in `overseer-pixeldiff/` on port 8001, EditProject page, TagPicker component, Settings page with Identity/Links/Skills sections, profile page overhaul, consistent color palette, fixed Google avatar loading (`referrerPolicy="no-referrer"`) |
| 0.1.4   | 2026-04-19 | Expanded frontend pages (ProjectPage, NewProjectPage, NotFoundPage), desktop app pages (Login, Workspace, PushFolderModal), Electron IPC for git-style pushes, reusable components (Modal, PageBanner, Section, Field, AlertBanner, VisibilityPicker), GitHub Actions CI |