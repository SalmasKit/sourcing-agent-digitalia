# Sourcing Agent - Backend Architecture & Technical Details

Ce document résume les choix d'architecture, de sécurité et d'optimisation de base de données implémentés pour le service backend Spring Boot de l'Agent de Sourcing de Profils.

## 1. Structure Globale du Projet

Le service Spring Boot est organisé selon une architecture en couches et orientée domaines (Bounded Contexts) pour garantir la séparation des responsabilités et faciliter la maintenance :

```
backend-spring/
├── pom.xml
├── Dockerfile
├── sonar-project.properties
├── .env.example
└── src/
    ├── main/
    │   ├── java/com/digitalia/sourcing/
    │   │   ├── SourcingApplication.java       # Point d'entrée avec @EnableAsync
    │   │   ├── config/                        # SecurityConfig, CorsConfig, JpaConfig, OpenApiConfig, AgentClientConfig
    │   │   ├── shared/                        # GlobalExceptionHandler, ApiResponse, AuditableEntity
    │   │   ├── domain/
    │   │   │   ├── auth/
    │   │   │   │   ├── model/           # User (implémente UserDetails), Role (enum RECRUITER/HR_ADMIN/SUPER_ADMIN), RefreshToken
    │   │   │   │   ├── dto/             # RegisterRequest, LoginRequest, LoginResponse, UserDto, RefreshTokenRequest
    │   │   │   │   ├── repository/      # UserRepository, RefreshTokenRepository
    │   │   │   │   ├── service/         # JwtService (JJWT 0.12), AuthService (register, login, refresh, logout)
    │   │   │   │   └── controller/      # AuthController — POST /register (201), /login, /refresh (body), /logout (body)
    │   │   │   ├── search/                    # SearchRequest, SearchStatus, SearchOrchestrationService, SearchController
    │   │   │   └── profile/                   # Profile, ProfileService, ProfileController
    │   │   └── infrastructure/
    │   │       ├── security/                  # JwtAuthenticationFilter
    │   │       └── agent/                     # AgentClient (WebClient vers service Python)
    │   └── resources/
    │       ├── application.yml
    │       ├── application-dev.yml
    │       └── db/migration/                  # V1 (users), V2 (search_requests), V3 (profiles)
    └── test/
        └── java/com/digitalia/sourcing/
            ├── domain/auth/                   # AuthServiceTest, AuthControllerTest
            ├── domain/search/                 # SearchControllerTest
            ├── domain/profile/                # ProfileServiceTest
            └── TestcontainersConfiguration.java
```

---

## 2. Choix Technologiques & Justifications

*   **Java 21 & Spring Boot 3.3** :
    *   Utilisation des **Virtual Threads** via la propriété `spring.threads.virtual.enabled: true`.
    *   Utilisation des **Records Java** pour l'intégralité des DTOs pour assurer l'immutabilité et éliminer le code boilerplate.
*   **Spring Security 6 & JJWT (0.12.x)** :
    *   Authentification sans état (stateless) basée sur des jetons JWT.
    *   Rotation et révocation des Refresh Tokens persistés dans PostgreSQL pour une déconnexion sécurisée.
*   **Flyway Migration** :
    *   Gestion de schéma de base de données évolutive et immuable. Les tables sont créées via des scripts SQL versionnés.
*   **Sécurité CORS restreinte** ✅ :
    *   `allowedOrigins` externalisé via `app.cors.allowed-origins` (défaut : `http://localhost:5173`). Interdit tout site non déclaré de faire des requêtes avec credentials — évite le risque d'un wildcard `*` en production.

---

---

## 3. Base de Données & Migrations Flyway

Pour garantir une évolution immuable, traçable et performante du schéma de base de données en production, **Flyway** est utilisé pour exécuter des scripts SQL versionnés au démarrage de l'application :

### 3.1. Structure du Script `V1__create_users_table.sql`

*   **Table `users`** (Gestion des comptes utilisateurs) :
    *   `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`) : Identifiant unique généré nativement par PostgreSQL (évite la contention de séquence).
    *   `email` (`VARCHAR(255) NOT NULL UNIQUE`) : Adresse e-mail de connexion.
    *   `password` (`VARCHAR(255) NOT NULL`) : Hash BCrypt du mot de passe.
    *   `full_name` (`VARCHAR(255)`) : Nom complet de l'utilisateur.
    *   `role` (`VARCHAR(50) NOT NULL DEFAULT 'RECRUITER'`) : Rôle applicatif (`RECRUITER`, `HR_ADMIN`, `SUPER_ADMIN`).
    *   `enabled` (`BOOLEAN NOT NULL DEFAULT TRUE`) : Statut du compte.
    *   `created_at` / `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`) : Champs d'audit horodatés automatiquement.
*   **Table `refresh_tokens`** (Gestion des sessions JWT) :
    *   `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`) : Identifiant du token.
    *   `token` (`VARCHAR(255) NOT NULL UNIQUE`) : Hash SHA-256 du refresh token (stockage sécurisé).
    *   `user_id` (`UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`) : Clé étrangère vers l'utilisateur ; la suppression d'un utilisateur révoque automatiquement ses jetons actifs.
    *   `expiry_date` (`TIMESTAMPTZ NOT NULL`) : Date d'expiration.
    *   `revoked` (`BOOLEAN NOT NULL DEFAULT FALSE`) : Statut de révocation (déconnexion ou réutilisation suspecte).
*   **Indexation ciblée pour la performance** :
    *   `idx_users_email` : Accélère les recherches d'utilisateurs lors du login (`findByEmail`).
    *   `idx_users_role` : Optimise le filtrage par rôle.
    *   `idx_rt_token` : Accélère la vérification des refresh tokens lors de la régénération d'access token (`findByTokenHash`).

> **Pourquoi Flyway plutôt que DDL Auto d'Hibernate (`ddl-auto=update`) ?**
> Flyway garantit un contrôle SQL exact (types natifs PostgreSQL comme `UUID` et `TIMESTAMPTZ`, contraintes `CASCADE`) et assure des migrations déterministes et sécurisées sur tous les environnements (Dev, Staging, Prod).

---

## 4. Optimisation de la Base de Données pour la Performance

Pour garantir des requêtes rapides même avec un volume de **100 millions ou 1 milliard de données**, les optimisations suivantes ont été appliquées :

1.  **UUID natifs de PostgreSQL** : Clés primaires via `gen_random_uuid()` — pas de contention de séquence.
2.  **Mapping JSONB (Hibernate 6)** : Colonnes `skills`, `extracted_criteria`, `score_breakdown` en JSONB avec index GIN sur `skills` pour la recherche sémantique multi-critères.
3.  **Indexation partielle** : Index sur `status` limité aux états actifs (`PENDING`, `RUNNING`) — l'index ne grossit pas avec les données historiques terminées.
4.  **Index composite & Tri** : Index `(search_request_id, score DESC)` pour des scans uniquement d'index lors du classement des profils.
5.  **Projections JPA ciblées** : `ProfileSummaryDto` via JPQL au lieu de `SELECT *` — évite le chargement de `raw_data` en liste.
6.  **Pagination obligatoire** : Tous les endpoints liste imposent un `Pageable`.

---

## 4. Intégration non-bloquante avec le service Python

La communication entre Spring Boot et le service de traitement IA Python s'effectue via un client **`WebClient`** réactif :

*   Les requêtes sont initiées de manière asynchrone grâce à `@Async` et au framework Project Reactor.
*   Spring Boot persiste immédiatement la recherche avec l'état `PENDING` et rend la main au frontend.
*   Le service Python traite la demande en tâche de fond. Dès réception des résultats, Spring Boot met à jour l'état à `COMPLETED` et persiste les profils. En cas d'erreur, l'état bascule à `FAILED`.
*   **Robustesse de la communication** ✅ :
    *   ✅ *Timeout de connexion externalisé* : `app.agent.connect-timeout-ms` (défaut 5000ms) via `ChannelOption.CONNECT_TIMEOUT_MILLIS`.
    *   ✅ *Journalisation complète* : Filtre `logRequest()` (méthode + URL) + `logResponse()` (statut HTTP reçu).
    *   ✅ *Gestion des erreurs HTTP (4xx/5xx)* : `.onStatus()` mappe les erreurs de l'agent vers `AgentServiceException`.
    *   ✅ *Mécanisme de Retry* : 3 essais avec backoff exponentiel pour les erreurs réseau transitoires. Les erreurs logiques (statuts HTTP) ne déclenchent pas de retry.

---

## 5. Architecture de Gestion Globale des Exceptions & Format de Réponse

L'application utilise une réponse unifiée via [ApiResponse.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/main/java/com/digitalia/sourcing/shared/response/ApiResponse.java) et centralise l'ensemble des erreurs HTTP dans [GlobalExceptionHandler.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/main/java/com/digitalia/sourcing/shared/exception/GlobalExceptionHandler.java) :

*   **`InvalidRefreshTokenException` → HTTP 401 Unauthorized** :
    Exception dédiée levée lors d'un refresh token expiré, invalide ou révoqué dans `AuthService`. Distingue nettement les problèmes d'authentification (401) des conflits métier.
*   **`IllegalArgumentException` → HTTP 409 Conflict** :
    Réservée aux conflits métier applicatifs (ex: `Email already in use`).
*   **`ResourceNotFoundException` → HTTP 404 Not Found** :
    Levée lorsqu'une ressource recherchée (utilisateur, profil, demande) est introuvable.
*   **`MethodArgumentNotValidException` → HTTP 400 Bad Request** :
    Capture automatiquement les erreurs de validation `@Valid` des DTOs et retourne la map des champs invalides dans la propriété `data` de `ApiResponse`.
*   **`BadCredentialsException` / `AuthenticationException` → HTTP 401 Unauthorized** :
    Erreurs de connexion avec identifiants incorrects.
*   **`AccessDeniedException` → HTTP 403 Forbidden** :
    Erreurs d'autorisation Spring Security lorsqu'un utilisateur tente d'accéder à une ressource hors de ses privilèges.

---

## 6. Environnement de Test & Couverture JaCoCo

La suite de tests unitaires et d'intégration WebMvc garantit une couverture globale de **76%** sur l'ensemble du projet (**>93%** sur le code applicatif hors classes de configuration `@Configuration`) :

*   ✅ **Testcontainers** : Instance PostgreSQL jetable via `PostgreSQLContainer` pour les tests d'intégration.
*   ✅ **Tests Unitaires de Services (Mockito & StepVerifier)** :
    *   [AuthServiceTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/auth/service/AuthServiceTest.java) : Inscription, encodage BCrypt, authentification, rotation de refresh tokens, révocation et déconnexion.
    *   [JwtServiceTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/auth/service/JwtServiceTest.java) : Génération de tokens JWT, extraction de claims, validation et calcul d'expiration.
    *   [SearchOrchestrationServiceTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/search/service/SearchOrchestrationServiceTest.java) : Orchestration asynchrone des recherches, filtrage selon le rôle (`RECRUITER` vs `HR_ADMIN`), habilitations d'accès (100% de couverture).
    *   [SearchResultPersistenceServiceTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/search/service/SearchResultPersistenceServiceTest.java) : Persistence des profils sourcés et basculement d'état en cas d'échec de l'agent.
    *   [ProfileServiceTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/profile/service/ProfileServiceTest.java) : Règles d'accès par rôle aux profils candidats.
    *   [AgentClientTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/infrastructure/agent/AgentClientTest.java) : Pipeline réactif `WebClient` avec gestion des erreurs 4xx/5xx et retries.
    *   [JwtAuthenticationFilterTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/infrastructure/security/JwtAuthenticationFilterTest.java) : Interception des requêtes HTTP, extraction Bearer token et alimentation du `SecurityContextHolder` (100% de couverture).
    *   [GlobalExceptionHandlerTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/shared/exception/GlobalExceptionHandlerTest.java) & [ApiResponseTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/shared/response/ApiResponseTest.java) : Validation des codes HTTP de retour et des formats de réponse.
*   ✅ **Tests de Tranches Web (MockMvc + @WebMvcTest)** :
    *   [AuthControllerTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/auth/controller/AuthControllerTest.java) : Formats de requêtes/réponses auth et validation des champs.
    *   [ProfileControllerTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/profile/controller/ProfileControllerTest.java) : Récupération des profils et détails de candidats (100% de couverture).
    *   [SearchControllerTest.java](file:///c:/Users/Dell/Projects/sourcing-agent-project/backend-spring/src/test/java/com/digitalia/sourcing/domain/search/controller/SearchControllerTest.java) : Contrat d'API de recherche.

---

## 7. Changelog — Modifications Appliquées

| # | Fichier | Modification | Statut |
|---|---------|-------------|--------|
| 1 | `pom.xml` | Correction Spring Boot 4.0 → 3.3.5, ajout JJWT 0.12, Springdoc, WebFlux, JaCoCo, MapStruct | ✅ |
| 2 | `CorsConfig.java` | Remplacement du wildcard `*` par `allowedOrigins` externalisé via `app.cors.allowed-origins` | ✅ |
| 3 | `CorsConfig.java` | Remplacement du `CorsFilter` @Bean par `CorsConfigurationSource` @Bean — intégration dans la Security chain | ✅ |
| 4 | `SecurityConfig.java` | Ajout de `.cors(cors -> cors.configurationSource(...))` pour traiter les requêtes preflight OPTIONS avant l'auth JWT | ✅ |
| 5 | `AgentClientConfig.java` | Ajout `connectTimeoutMs` externalisé, filtre `logRequest()`, filtre `logResponse()` | ✅ |
| 6 | `AgentClient.java` | Ajout `.onStatus()` pour HTTP 4xx/5xx, retry avec backoff exponentiel (3 essais) | ✅ |
| 7 | `application.yml` | Ajout `app.cors.allowed-origins` et `app.agent.connect-timeout-ms` | ✅ |
| 8 | `.env.example` | Ajout `FRONTEND_CORS_ORIGIN` | ✅ |
| 9 | `TestcontainersConfiguration.java` | Correction import `org.testcontainers.containers.PostgreSQLContainer` | ✅ |
| 10 | Tests unitaires | `AuthServiceTest`, `ProfileServiceTest`, `AuthControllerTest`, `SearchControllerTest` | ✅ |
| 11 | `CorsConfig.java` + `SecurityConfig.java` | CORS intégré dans la Security chain — résout le conflit preflight OPTIONS/401 | ✅ |
| 12 | `V1__create_users_table.sql` + `BACKEND.md` | Documentation complète de la migration Flyway V1 (users, refresh_tokens, index) | ✅ |
| 13 | `InvalidRefreshTokenException.java` | Création de l'exception dédiée pour séparer la révocation/expiration des tokens (401) des conflits (409) | ✅ |
| 14 | `ResourceNotFoundException.java` | Suppression de l'annotation `@ResponseStatus` redondante | ✅ |
| 15 | `GlobalExceptionHandler.java` + `AuthControllerTest.java` | Ajout handler `InvalidRefreshTokenException` (401) et test d'intégration pour les erreurs de validation (400) | ✅ |
| 16 | `RateLimitingInterceptor.java` + `RateLimitConfig.java` | Implémentation du Rate Limiter sliding-window par IP avec en-têtes HTTP (`X-RateLimit-*`, `Retry-After`) et configuration Spring MVC | ✅ |
| 17 | Tests unitaires (`RateLimitingInterceptorTest`, `ProfileControllerTest`) | Ajout de la suite de tests complète pour le Rate Limiter et correction des imports du ProfileControllerTest (69 tests unitaires validés) | ✅ |



