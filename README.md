# Real-time Collaborative Note-Taking App

This repository contains the backend server for a real-time collaborative note-taking application. It handles user authentication, note board management, real-time collaboration via WebSockets, and provides advanced semantic search capabilities for efficient information retrieval.

## Features

- **User Authentication & Authorization:** Secure user registration, login, and session management using JWT. All data access is authorized based on user roles (owner/collaborator).
- **Note Board Management:** Create, read, update, and delete note boards. Each board has an owner and can have multiple collaborators.
- **Real-time Note Management:** Perform CRUD operations (Create, Read, Update, Delete) on notes within boards. Notes can be marked as `isDone`.
- **WebSocket API:** All collaborative features (note updates, board changes, collaborator management) are synchronized in real-time using WebSockets.
- **Semantic Search:** Advanced search functionality that understands the meaning of your query, powered by text embeddings and a vector database.
- **Database:** PostgreSQL with `pgvector` extension for storing application data and vector embeddings.
- **Type-Safe Development:** Built with TypeScript and Kysely for robust, type-safe database interactions.
- **Client:** Basic client set up for interaction with backend server.

- For more details please see in folder **./documentation**, folder is containing ERD diagram PRD documentation and short presentation for use of AGILE principles with **Kanban**

## Technologies Used

- **Node.js:** JavaScript runtime.
- **Express.js:** Web application framework for RESTful APIs and HTTP server.
- **TypeScript:** Type-safe JavaScript superset.
- **Kysely:** Type-safe SQL query builder for Node.js.
- **PostgreSQL:** Relational database with `pgvector` extension.
- **tRPC endpoints** for HTTP requests
- **ws:** WebSocket library for Node.js.
- **Zod:** Schema declaration and validation library.
- **jwt-simple:** For JSON Web Token handling.
- **bcrypt:** For password hashing (with pepper).
- **Vitest:** Unit and integration testing framework.
- **Docker / Docker Compose:** For easy setup of the development environment (especially PostgreSQL).
- **[Your Embedding Provider]:** (e.g., OpenAI API for text embeddings)
- **back-end testing** (Vitest)
- **vite + VUE** light weight client setup

* **Monorepo** structure for easy management of client and server

## Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm or Yarn
- Docker & Docker Compose (for easy PostgreSQL setup)

### 1. Clone the Repository

```bash
git clone [YOUR_REPO_URL]
```

### 2. Install Dependencies

1. `npm install`
2. Create a PostgreSQL database with pg-vector with docker-compose.yml with
   `docker compose up -d`, `docker compose down`,
   or use an existing one
3. Setup `.env` file based on `.env.example` files.

## Project Structure

```
.
├── client/   # Front-end (Vue 3 + Vite)
├── server/   # Back-end (Express.js + tRPC)
├── .env.example
├── package.json
├── README.md
└── ...
```

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create a PostgreSQL database** and update `.env` files in both `client` and `server` based on their `.env.example` files.

## Running the project in development

- **Server (back end):**
  ```bash
  npm run dev -w server
  ```
- **Client (front end):**
  ```bash
  npm run dev -w client
  ```

## Tests

- **Front end unit and E2E tests:**
  ```bash
  npm test -w client
  ```
- **Front end unit tests only:**
  ```bash
  npm run test:unit -w client
  ```
- **Front end E2E tests only:**
  ```bash
  npm run test:e2e -w client
  ```
- **Back end tests:**
  ```bash
  npm test -w server
  ```

## Migrations

- **Prepare a new migration:**
  ```bash
  npm run migrate:new myMigrationName -w server
  ```
- **Run all pending migrations:**
  ```bash
  npm run migrate:latest -w server
  ```

## Running the project in production

- **Client:**
  ```bash
  npm run build -w client
  npm run preview -w client
  ```
- **Server:**
  ```bash
  npm run build -w server
  npm run start -w server
  # or migrate + start
  npm run prod -w server
  ```

## Linting

- **Lint the codebase:**
  ```bash
  npm run lint
  ```

## How to poke and use

### Password rules

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&\*()\_+{}[]:;<>,.?~-)

---

### API Exploration

- Use light weight client set up for interaction with the backend server, http://localhost:5173/

## Additional Notes

- Ensure your `.env` files are correctly set up for both client and server.
- See [client/README.md](client/README.md) and [server/README.md](server/README.md) for more detailed instructions for each package.

## License

MIT
