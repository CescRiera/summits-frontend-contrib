# Backend Endpoints Specification for Block/Report Feature

## Overview

This document specifies the backend API endpoints needed to support user blocking and content reporting functionality. The system should use these endpoints when users are logged in, and fall back to localStorage when users are not authenticated.

## Endpoints

### 1. Block User

**Endpoint:** `POST /api/user/block`

**Request Body:**

```json
{
  "user_id": number
}
```

**Response:**

```json
{
  "success": boolean,
  "message": string (optional)
}
```

**Logic:**

- Verify the authenticated user (from JWT token)
- Check if the target user_id exists
- Check if user is trying to block themselves (should return error)
- Insert/update record in `blocked_users` table:
  - `blocker_user_id` (current user)
  - `blocked_user_id` (target user)
  - `blocked_at` (timestamp)
- Return success response

**Error Cases:**

- 401: User not authenticated
- 400: Cannot block yourself
- 404: Target user not found
- 409: User already blocked (idempotent - return success)

---

### 2. Unblock User

**Endpoint:** `POST /api/user/unblock`

**Request Body:**

```json
{
  "user_id": number
}
```

**Response:**

```json
{
  "success": boolean,
  "message": string (optional)
}
```

**Logic:**

- Verify the authenticated user
- Delete record from `blocked_users` table where:
  - `blocker_user_id` = current user
  - `blocked_user_id` = target user_id
- Return success response (even if record didn't exist - idempotent)

**Error Cases:**

- 401: User not authenticated

---

### 3. Get Blocked Users

**Endpoint:** `GET /api/user/blocked`

**Response:**

```json
{
  "blocked_users": [
    {
      "user_id": number,
      "user_name": string,
      "blocked_at": string (ISO 8601 timestamp)
    }
  ]
}
```

**Logic:**

- Verify the authenticated user
- Query `blocked_users` table where `blocker_user_id` = current user
- Join with `users` table to get user_name
- Return list of blocked users ordered by `blocked_at` DESC

**Error Cases:**

- 401: User not authenticated

---

### 4. Report Content (Routes and Users)

**Endpoint:** `POST /api/content/report`

**Authentication:** Optional (works for both authenticated and anonymous users)

**Note:** Both routes and users can be reported. Use `content_type` to distinguish:

- `"route"`: Report a specific route
- `"user"`: Report a user

**Request Body:**

```json
{
  "content_id": number,
  "content_type": "route" | "user",
  "user_id": number,
  "reason": string (optional)
}
```

**Response:**

```json
{
  "success": boolean,
  "message": string (optional)
}
```

**Logic:**

- Check if user is authenticated (optional - from JWT token if present)
- Validate content_type is either "route" or "user"
- Check if content exists:
  - If "route": check routes table
  - If "user": check users table (content_id should equal user_id)
- Insert record in `reported_content` table:
  - `reporter_user_id` (current user if authenticated, NULL if anonymous)
  - `reporter_ip` (optional - for anonymous reports)
  - `content_id` (route ID or user ID depending on content_type)
  - `content_type` ("route" or "user")
  - `reported_user_id` (the user who created/owns the content, or the reported user if content_type is "user")
  - `reason` (optional)
  - `reported_at` (timestamp)
- Return success response

**Error Cases:**

- 400: Invalid content_type (must be "route" or "user")
- 404: Content not found (route or user doesn't exist)
- 409: Content already reported (idempotent - return success)
  - For authenticated users: check by reporter_user_id
  - For anonymous users: check by IP address (optional)

---

## Database Schema

### `blocked_users` Table

```sql
CREATE TABLE blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_user_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_user_id);
```

### `reported_content` Table

```sql
CREATE TABLE reported_content (
  id SERIAL PRIMARY KEY,
  reporter_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  reporter_ip VARCHAR(45), -- For anonymous reports (IPv4 or IPv6)
  content_id INTEGER NOT NULL, -- Route ID or User ID depending on content_type
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('route', 'user')),
  reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Unique constraint: either by user_id or by IP for anonymous
  UNIQUE(reporter_user_id, content_id, content_type),
  UNIQUE(reporter_ip, content_id, content_type) WHERE reporter_user_id IS NULL
);

CREATE INDEX idx_reported_content_reporter ON reported_content(reporter_user_id);
CREATE INDEX idx_reported_content_type ON reported_content(content_type, content_id);
CREATE INDEX idx_reported_content_ip ON reported_content(reporter_ip) WHERE reporter_user_id IS NULL;
```

---

## Frontend Integration Notes

1. **Authentication Check:**

   - Frontend checks for auth token before making API calls
   - If no token, uses localStorage instead
   - If API call fails with 401, falls back to localStorage

2. **Caching:**

   - Frontend maintains localStorage cache even when using API
   - This allows for offline functionality and faster initial loads

3. **Filtering:**

   - When displaying lists (routes, peaks, users), frontend should:
     - Fetch blocked users list
     - Filter out content from blocked users OR show "Blocked User" placeholder
     - For leaderboard/explore: Show "Blocked User" instead of hiding

4. **Sync:**
   - On login, frontend should:
     - Fetch blocked users from API
     - Merge with localStorage (prefer API data)
     - Update localStorage cache

---

## Security Considerations

1. **Rate Limiting:**

   - Implement rate limiting on report endpoint to prevent abuse
   - Suggested: Max 10 reports per user per hour

2. **Validation:**

   - Validate all user_ids exist
   - Prevent self-blocking
   - Validate content_type enum values

3. **Privacy:**

   - Blocked users should not be notified they are blocked
   - Reports should be reviewed by moderators (future feature)

4. **Data Retention:**
   - Consider implementing soft deletes for reports
   - Keep blocked user records until explicitly unblocked

---

## Future Enhancements

1. **Moderation Dashboard:**

   - Endpoint to list all reports for admin review
   - Ability to mark reports as resolved/actioned

2. **Auto-Moderation:**

   - If user receives X reports, auto-hide their content temporarily
   - Require admin review before restoring

3. **Report Categories:**

   - Add predefined report reasons (spam, harassment, inappropriate content, etc.)

4. **Block Reasons:**
   - Allow users to optionally provide reason when blocking (for analytics)
