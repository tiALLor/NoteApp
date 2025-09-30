## Product Requirements Document (PRD): Real-time Collaborative Note-Taking App

**Document Version:** 1.0
**Date:** 2025-10-27
**Product Manager:** Tibor Bebjak

---

### 1. Introduction

#### 1.1 Product Vision

To provide a seamless, real-time, and intelligently organized platform for individuals and teams to capture, collaborate on, and efficiently retrieve their ideas and tasks. We aim to enhance productivity through intuitive collaboration features and cutting-edge semantic search capabilities, ensuring information is always at the user's fingertips.

#### 1.2 Product Goals

- **Enhance Collaboration:** Enable multiple users to co-edit notes and boards in real-time, seeing changes instantly.
- **Improve Information Retrieval:** Implement powerful semantic search to allow users to find relevant notes based on meaning, not just keywords.
- **Streamline Note Organization:** Provide flexible board-based organization for managing diverse sets of notes.
- **Ensure Data Integrity & Security:** Protect user data through robust authentication and secure communication.
- **Deliver a Responsive User Experience:** Offer a fast, reliable, and intuitive interface for all core functionalities.

#### 1.3 Target Audience

- **Teams:** Small to medium-sized teams requiring a shared workspace for project notes, brainstorming, and task management.
- **Individuals:** Professionals, students, and anyone needing an efficient personal note-taking and organization tool.
- **Knowledge Workers:** Users who deal with large volumes of information and need advanced search capabilities.

### 2. Product Scope

#### 2.1 In-Scope Features

- **User Authentication:** Registration, Login, Session Management.
- **Real-time Note Boards:** Create, update, and delete personal and collaborative boards.
- **Real-time Note Management:** Create, update, delete, and mark notes as "done" within boards.
- **Real-time Collaboration:**
  - Instantaneous updates to notes and boards visible to all active collaborators.
  - Add/Remove collaborators to/from specific note boards.
- **Semantic Search:** Search notes across all user-accessible boards based on the semantic meaning of the query.
- **WebSocket Communication:** All real-time updates (note edits, board changes, collaboration changes) will leverage WebSockets.
- **User Management:** Basic user profile (username, email).

#### 2.2 Out-of-Scope Features (for V1.0)

- Rich text editing (e.g., Markdown support, formatting).
- File attachments to notes.
- Mobile application (focus on web client).
- Version history for notes/boards.
- Guest access or public sharing.
- Advanced user roles beyond owner/collaborator.
- Notifications (e.g., when a collaborator updates a note).
- Offline mode.
- Semantic search for note board title

### 3. User Stories (High-Level)

- As a **product owner**, I want to **store notes and share them with team members** so that any team member can access the notes any time in real time..
- As a **product owner**, I want to **create an account and log in** so that only relevant members can access the data (e.g. invite collaborator or password protected).
- As a **team member**, I want to **search the notes with semantic support** so that I can find remarks quickly.
- As a **user**, I want to **have a note board functionality,** so I can organize my notes by project or topic.
- As a **user**, I want to **mark a note as done** so I can track my progress.

### 4. Functional Requirements

#### 4.1 User Authentication

- **FR.AUTH.1:** Users shall be able to register with a unique username, email, and password.
- **FR.AUTH.2:** Users shall be able to log in using their email/username and password.
- **FR.AUTH.3:** The system shall validate user credentials and issue an access token upon successful login.
- **FR.AUTH.4:** The system shall maintain user session via access tokens for WebSocket connections.

#### 4.2 Note Board Management

- **FR.BOARD.1:** Users shall be able to create a new note board with a title. The creator is automatically the owner.
- **FR.BOARD.2:** Board owners shall be able to update the title of their note boards.
- **FR.BOARD.3:** Board owners shall be able to delete their note boards. All associated notes and collaborator entries will also be deleted.
- **FR.BOARD.4:** Board owners shall be able to add and remove a collaborator to their note boards.
- **FR.BOARD.5:** Users shall be able to retrieve all note boards they own or collaborate on, including all notes.

#### 4.3 Note Management

- **FR.NOTE.1:** Users shall be able to create new notes within any board they have access to.
- **FR.NOTE.2:** Users shall be able to update the content of any note within boards they have access to. Updates will be real-time.
- **FR.NOTE.3:** Users shall be able to toggle the `isDone` status of any note within boards they have access to. Updates will be real-time.
- **FR.NOTE.4:** Users shall be able to delete notes from any board they have access to. Updates will be real-time.

#### 4.4 Real-time Collaboration (WebSocket-driven)

- **FR.COLLAB.1:** All changes to notes (create, update content, update `isDone`, delete) shall be broadcasted in real-time to all active WebSocket connections associated with the affected board.
- **FR.COLLAB.2:** All changes to note board titles shall be broadcasted in real-time to all active WebSocket connections associated with the affected board.
- **FR.COLLAB.3:** Board owners shall be able to add other users as collaborators to their note boards. This change shall be broadcasted.
- **FR.COLLAB.4:** Board owners shall be able to remove collaborators from their note boards. This change shall be broadcasted.
- **FR.COLLAB.5:** Upon a collaborator being added or removed, all active clients on that board (including the affected user) should receive an update reflecting the change in collaboration status or the updated board details.
- **FR.COLLAB.6:** Only authenticated users with valid access tokens can establish a WebSocket connection.
- **FR.COLLAB.7:** WebSocket connections must be tied to a specific `userId`.

#### 4.5 Semantic Search

- **FR.SEARCH.1:** Users shall be able to submit a natural language query via the WebSocket connection to search for notes.
- **FR.SEARCH.2:** The system shall perform a semantic search across all notes the `userId` has access to (owned boards and collaborated boards).
- **FR.SEARCH.3:** Search results shall be ranked by relevance (similarity score) and returned to the querying client.
- **FR.SEARCH.4:** The search functionality will incorporate a configurable `limit` (default 5) and `threshold` (default 0.5) to filter results.

### 5. Non-Functional Requirements

#### 5.1 Performance

- **NFR.PERF.1:** Real-time updates via WebSockets should be delivered to collaborators within 500ms for typical usage.
- **NFR.PERF.2:** Semantic search queries should return results within 2 seconds for a database of up to 100,000 notes.
- **NFR.PERF.3:** API responses (e.g., login, get all boards) should be delivered within 300ms.

#### 5.2 Security

- **NFR.SEC.1:** All communication between client and server (HTTP and WebSocket) shall be encrypted using TLS/SSL. **Important note**: HTTPS/WSS may not be used during local development or in test environments.

* **NFR.SEC.2:** Access tokens shall be short-lived and refreshed securely.
* **NFR.SEC.3:** User passwords shall be securely hashed and salted (e.g., bcrypt).
* **NFR.SEC.4:** All data access (CRUD operations) must enforce authorization checks (e.g., only owner/collaborator can modify a board/note).
* **NFR.SEC.5:** Input validation shall be performed on all incoming data to prevent injection attacks (e.g., Zod schemas).

#### 5.3 Reliability & Scalability

- **NFR.REL.1:** The server should be able to handle at least 500 concurrent WebSocket connections.
- **NFR.REL.2:** The system should be resilient to individual component failures (e.g., if the embedding service is temporarily down, the note creation/update should still succeed, but embedding will be missing/retried).
- **NFR.REL.3:** Database operations should be transactional where appropriate (e.g., note board creation with initial owner).

#### 5.4 Usability (UX is critical for note-taking apps)

- **NFR.USAB.1:** The user interface should be intuitive, allowing users to quickly understand how to perform core actions (create board, add note, search).
<!-- * **NFR.USAB.2:** Feedback should be provided for all user actions (e.g., success messages, error messages, loading states) (for final version of client). -->

### 6. Technical Architecture (High-Level)

- **Backend:** Node.js / Express (for REST API and HTTP server for WebSockets)
- **Database:** PostgreSQL (for relational data)
- **ORM/Query Builder:** Kysely (for type-safe database interactions)
- **Vector Database/Embedding Store:** Integrated with PostgreSQL using `pgvector` extension for semantic search.
- **Embedding Service:** External API (e.g., OpenAI, Cohere) for generating text embeddings.
- **Real-time Communication:** `ws` library for WebSocket server.
- **Authentication:** JWT (JSON Web Tokens) for stateless authentication.
- **Input Validation:** Zod schemas.

### 7. Open Questions / Dependencies

- **Embedding Provider:** Which specific embedding API will be used? (e.g., OpenAI `text-embedding-ada-002`)
- **Error Handling Strategy:** How granular should error messages be on the client side?
- **Client Implementation:** Assumptions about client's ability to handle WebSocket messages and update UI.
- **Deployment Environment:** Where will the application be hosted? (e.g., AWS, Vercel, self-hosted)

### 8. Future Considerations (for later versions)

- Detailed client.
- Organize users per groups to limit user visibility in collaborators.
- Evaluate communication change from ws to tRPC subscription with websocket system.
- Evaluate implementation restriction to change/ delete note only by creator or board owner.
- User notifications.
- Mobile client.
- Rich text editor.
- Folder/tagging system for notes/boards.
- Public/sharable links.
- Audit logs for changes.

---
