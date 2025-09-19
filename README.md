# Full Stack Capstone Project

This project is a full-stack web application built with TypeScript, Express.js, tRPC, PostgreSQL, and Vue 3 (Vite). It is structured as a monorepo with separate `client` and `server` packages.

## Features

- TypeScript throughout the stack
- PostgreSQL database with migration support
- Express.js server with tRPC endpoints
- User authentication
- Comprehensive back-end and front-end testing (Vitest, Playwright)
- Monorepo structure for easy management of client and server
- Linting and formatting with ESLint and Prettier
- Role-based user access (`admin`, `chef`, `user`)
- User with Role: admin can create other users will any given role
- User with Role: chef can manage meals and menus
- User with Role: user can order a menu and check
- Signup only for user with role user
- Users can order meals (`main`, `soup`) for future dates
- Menus are created per day and meal
- Secure password handling (bcrypt + pepper)
- To "poke" its existing functionality use trpc-panel a http://localhost:3000/api/v1/trpc-panel or user rest.http file in /server/tests with REST Client

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

link to running service:

https://cantina-service-1.g7k0w3n7paahe.eu-central-1.cs.amazonlightsail.com

### 1. Admin Setup

1. **Log in as admin using the default credentials:**

   - **Email:**
     ```
     admin@admin.com
     ```
   - **Initial password:**
     ```
     changeAdminPass
     ```

2. **Create a new user with the `chef` role**  
   Use the admin panel or API to add a chef.

---

### 2. Chef Actions

1. **Log in as the chef user you just created.**
2. **Create meals**  
   Add new meals to the system.
3. **Create menus**  
   Assign created meals to daily menus.

---

### 3. User Actions

1. **Sign up as a new user (role: `user`).**
2. **Log in as the new user.**
3. **Order menus**  
   Place orders for available menus.
4. **Change orders**  
   Modify existing orders if needed.
5. **Check order history**  
   View your past orders.

---

### 4. API Exploration

- Use the [tRPC panel](http://localhost:3000/api/v1/trpc-panel) for interactive API testing.
- Alternatively, use the REST Client requests in `/server/tests/rest.http`.

## Additional Notes

- Ensure your `.env` files are correctly set up for both client and server.
- See [client/README.md](client/README.md) and [server/README.md](server/README.md) for more detailed instructions for each package.
- The project aims for at least 70% back-end test coverage.

## License

MIT
