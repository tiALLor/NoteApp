# Real-time Collaborative Note-Taking App - Server

This repository contains the backend server for a real-time collaborative note-taking application. It handles user authentication, note board management, real-time collaboration via WebSockets, and provides advanced semantic search capabilities for efficient information retrieval.


## Setup

1. `npm install`
2. Create a PostgreSQL database with pg-vector with docker-compose.yml with
   `docker compose up -d`, `docker compose down`,
   or use an existing one
3. Setup `.env` file based on `.env.example` files.

## Migrations

```bash
# prepare a migration
npm run migrate:new myMigrationName

# migrate up to the latest migration
npm run migrate:latest
```

## Running the project in development

```bash
# automatically restarts the server
npm run dev
```

## Tests

```bash
# back end tests
npm test
```

## Running the server in production

Server:

```bash
npm run build
npm run start

# or migrate + start
npm run prod
```

## Password rules

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*()_+{}[]:;<>,.?~-)
