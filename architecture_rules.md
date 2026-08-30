# Architecture Rules

This repository enforces a small set of core architecture rules to avoid architectural drift and keep the system maintainable.

Rule A — Controllers must not access the database directly
- Description: Controller modules (HTTP handlers / route controllers) must not create DB clients, run SQL queries, or import database models and ORMs directly.
- Rationale: Controllers should remain thin and only orchestrate request/response and validation. Direct DB access couples transport logic to persistence and makes testing and cross-cutting changes harder.
- Example (allowed): Controller calls a Service method which returns results.
- Example (violations): controller/usersController.js contains `const db = require('../db'); db.query('SELECT ...')`.
- Severity: High

Rule B — Services must communicate via events or well-defined interfaces (no direct cross-service function calls)
- Description: Business logic/services should interact using domain events, message buses, or clearly defined repository interfaces. Services should not reach into another service's internal functions or state.
- Rationale: Decoupling via events or interfaces preserves service autonomy, enables scaling, and reduces side-effects when refactoring.
- Example (allowed): `orderService.publishEvent('order.created', payload)` and `billingService` subscribes to that event.
- Example (violations): `orderService` imports `billingService` and calls `billingService.charge()` directly.
- Severity: Medium

Rule C — Data access must be funnelled through repository/DAO layers
- Description: Any code that reads from or writes to the persistent store must go through repository or DAO modules. Repositories encapsulate queries and mapping logic.
- Rationale: Centralizing data access simplifies query reuse, caching, auditing, and migration. It prevents duplication of SQL/ORM usage across the codebase.
- Example (allowed): `userRepository.findById(userId)` invoked by services.
- Example (violations): Arbitrary modules using `knex`, `sequelize`, `client.query`, or raw SQL strings directly.
- Severity: High

Guidance for reviewers and automated agents
- When a PR introduces a controller that imports a DB client or runs SQL, flag it as a high-priority drift.
- When a PR shows services calling each other's internals, recommend decoupling via events or a public API.
- If a PR adds a new repository/DAO, suggest adding unit tests and an interface comment explaining responsibilities.

Scoring hints
- High severity violation => urgency 4-5
- Medium severity violation => urgency 3
- No direct violations => urgency 1-2
