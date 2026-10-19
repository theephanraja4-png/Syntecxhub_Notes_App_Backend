# Syntecxhub Notes App Backend

Secure REST API for authenticated users to create, read, update, archive, restore, and soft-delete their own notes.

## Stack

Node.js 18+, Express 5, MongoDB, Mongoose, JWT, bcryptjs, Jest, Supertest.

## Features

- Password hashing with bcryptjs and JWT bearer authentication.
- User and Note Mongoose models with a virtual `User.notes` relationship.
- Ownership enforced in every note query using both `_id` and `owner`.
- Validation for required fields, email, passwords, IDs, filters, and note sizes.
- Consistent JSON responses and centralized error handling.
- Pagination and `archived=true|false` filtering.
- Archive/restore endpoints and soft deletion using `deletedAt`.
- Password hashes are excluded from serialized users and populated owners.

## Setup

Prerequisites: Node.js 18+, a running MongoDB instance (local or Atlas).

```powershell
cd Syntecxhub_Notes_App_Backend
npm install
Copy-Item .env.example .env
# edit .env and set MONGODB_URI and a random JWT_SECRET (16+ characters)
npm start
```

The health check is `GET http://localhost:5000/api/health`.

## API

All successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

| Method | Endpoint | Authentication |
|---|---|---|
| GET | `/api/health` | No |
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/users/me` | Bearer token; user populated with notes |
| GET | `/api/users/me/notes` | Bearer token; virtual populate |
| POST | `/api/notes` | Bearer token |
| GET | `/api/notes?archived=false&page=1&limit=20` | Bearer token |
| GET | `/api/notes/:id` | Bearer token; owner populated |
| PUT | `/api/notes/:id` | Bearer token |
| PATCH | `/api/notes/:id/archive` | Bearer token |
| PATCH | `/api/notes/:id/restore` | Bearer token |
| DELETE | `/api/notes/:id` | Bearer token; soft delete |

Register/login with JSON such as:

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "password123" }
```

Send the returned token on protected requests:

```text
Authorization: Bearer <JWT>
```

Create/update notes with `{ "title": "A title", "content": "Note content" }`. The server always sets `owner`; client ownership fields are rejected. A note is visible only to its owner. Deleted notes remain in MongoDB with `deletedAt`, but are excluded from normal retrieval and cannot be restored by the current API.

## Relationships

`Note.owner` references `User`. The User schema defines a virtual `notes` populate matching `User._id` to `Note.owner` and filtering out deleted notes. Note retrieval populates the owner with only `name` and `email`; password hashes are never selected in API responses.

## Tests

Tests use `mongodb-memory-server`, so they do not touch a development or production database:

```powershell
npm test
```

The importable Postman collection is at `postman/Syntecxhub_Notes_App_Backend.postman_collection.json`. Set the login token in the collection's `token` variable and the created note ID in `noteId`.

## Security audit

`npm audit` currently reports 22 findings (19 moderate and 3 high), all through development dependencies. The high findings are the `braces`/`chokidar` chain through `nodemon`; the available automated remediation would downgrade `nodemon` to 1.x. The moderate findings are the `sprintf-js` chain through Jest; the available automated remediation would downgrade Jest to 25.x. These are not applied because they are breaking, tool-only changes. Revisit the dependency tree when compatible patched releases are available.

## Environment

See `.env.example`. Never commit `.env`, credentials, JWTs, or `node_modules`. No deployment or GitHub push is claimed by this local implementation.
