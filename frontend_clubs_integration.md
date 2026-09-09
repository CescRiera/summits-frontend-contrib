# Clubs Frontend Integration Guide

This document is meant to be handed directly to a frontend agent so they can implement the full Clubs experience against the new backend API.

## Overview

The backend now exposes a new Clubs domain under `/api/clubs`.

A club:
- Has `name`, `description`, `image`, `visibility`
- Is created by exactly one user
- Can be `public` or `private`
- Can have many members
- Can only be edited, moderated, or deleted by its creator

Private club behavior:
- Private clubs still appear in browse/discovery
- Non-members can only see restricted club detail
- Joining a private club creates a pending request
- Only the creator can accept or reject requests

Leaderboard behavior:
- Default ranking is by `distinct_peak_count`
- Date-range leaderboard uses route-dated completions only
- All-time leaderboard includes manual peaks too

## Endpoints

Base path: `/api/clubs`

All authenticated endpoints require:

```http
Authorization: Bearer <firebase_token>
```

## Search Integration

The existing realtime search endpoint now also returns clubs in the mixed result list.

### Realtime Search With Clubs

**POST** `/api/search/searchRealTime`

```json
{
  "q": "pyrenees",
  "limit": 25
}
```

Auth is optional, but recommended when the user is signed in so club results can include viewer-specific membership state.

The response still returns a single mixed `results` array with multiple result types such as:
- `peak`
- `user`
- `admin`
- `mountain_range`
- `club`

### Club Search Result Shape

When an item is a club, it now looks like:

```json
{
  "type": "club",
  "id": 12,
  "name": "Pyrenees Finishers",
  "description": "Club for Pyrenees peak tracking",
  "image": "https://...",
  "visibility": "private",
  "member_count": 18,
  "distinct_peak_count": 244,
  "creator": {
    "id": 38140,
    "name": "John Doe",
    "image": "https://..."
  },
  "membership": {
    "status": "pending",
    "role": "member"
  },
  "is_creator": false,
  "restricted": true,
  "relevance_score": 93.2
}
```

Notes:
- `membership` is `null` when the authenticated user has no membership/request for that club
- `restricted: true` means this is a private club and the current viewer is not an accepted member or creator
- `distinct_peak_count` is the club-wide distinct peak total across accepted members
- search ranking uses fuzzy similarity and partial matching on club `name` and `description`

### Frontend Search UI Changes

Update the global search/autocomplete UI so it can render club results:
- show club image
- show club name
- show description subtitle
- show visibility badge
- show member count
- show distinct peak count
- show creator name
- show membership state if present

Recommended CTA/label behavior in search results:
- public + no membership -> `Join club` or plain result row linking to club detail
- private + no membership -> `Private club`
- pending membership -> `Request pending`
- accepted membership -> `Member`
- creator -> `Creator`

For restricted private-club search results:
- still show the result row
- do not assume the club detail page will expose members/leaderboard/activity unless membership is accepted
- link normally to the club detail page, which should handle the restricted state

### 1. Create Club

**POST** `/api/clubs/createClub`

**Content-Type**: `multipart/form-data`

Fields:
- `name`: string, required
- `description`: string, required
- `visibility`: `"public"` or `"private"`
- `image`: file, required

Response:

```json
{
  "success": true,
  "club": {
    "id": 12,
    "name": "Pyrenees Finishers",
    "description": "Club for Pyrenees peak tracking",
    "image": "https://...",
    "visibility": "public",
    "created_at": "2026-04-22T10:00:00.000Z",
    "updated_at": "2026-04-22T10:00:00.000Z",
    "creator": {
      "id": 38140,
      "name": "John Doe",
      "image": "https://..."
    },
    "member_count": 1,
    "distinct_peak_count": 0,
    "membership": {
      "status": "accepted",
      "role": "creator",
      "requested_at": "2026-04-22T10:00:00.000Z",
      "joined_at": "2026-04-22T10:00:00.000Z",
      "responded_at": "2026-04-22T10:00:00.000Z"
    },
    "is_creator": true,
    "restricted": false
  },
  "message": "Club created successfully"
}
```

### 2. Update Club

**POST** `/api/clubs/updateClub`

**Content-Type**: `multipart/form-data`

Fields:
- `club_id`: number, required
- `name`: string, optional
- `description`: string, optional
- `visibility`: `"public"` or `"private"`, optional
- `image`: file, optional

Creator only.

### 3. Delete Club

**POST** `/api/clubs/deleteClub`

```json
{
  "club_id": 12
}
```

Creator only.

### 4. Get Club Details

**POST** `/api/clubs/getClubDetails`

```json
{
  "club_id": 12
}
```

Auth is optional. For private clubs:
- creator/member gets full data
- non-member gets restricted club payload and `stats: null`

Response:

```json
{
  "club": {
    "id": 12,
    "name": "Pyrenees Finishers",
    "description": "Club for Pyrenees peak tracking",
    "image": "https://...",
    "visibility": "private",
    "created_at": "2026-04-22T10:00:00.000Z",
    "updated_at": "2026-04-22T10:00:00.000Z",
    "creator": {
      "id": 38140,
      "name": "John Doe",
      "image": "https://..."
    },
    "member_count": 18,
    "membership": {
      "status": "pending",
      "role": "member",
      "requested_at": "2026-04-23T08:00:00.000Z",
      "joined_at": null,
      "responded_at": null
    },
    "is_creator": false,
    "restricted": true
  },
  "stats": null
}
```

If not restricted, `club` also includes:
- `distinct_peak_count`

And `stats` includes:

```json
{
  "member_count": 18,
  "distinct_peak_count": 244,
  "total_ascents": 512,
  "active_members_30d": 9,
  "top_member": {
    "user_id": 99,
    "user_name": "Alice",
    "user_image": "https://...",
    "distinct_peak_count": 87
  }
}
```

### 5. Get My Clubs

**POST** `/api/clubs/getMyClubs`

Returns accepted and pending memberships for the logged-in user.

Use this to build:
- My created clubs
- My joined clubs
- Pending join requests

### 6. Browse Clubs

**POST** `/api/clubs/getClubs`

Request:

```json
{
  "visibility": "public",
  "search": "pyrenees",
  "sort_by": "most_users",
  "limit": 20,
  "offset": 0
}
```

Supported `sort_by`:
- `most_users`
- `most_peaks`
- `newest`
- `oldest`

Response:
- `clubs`
- `total`
- `total_count`
- `has_more`
- `pagination`

Each club item includes:
- basic club data
- membership state if the viewer is authenticated
- `restricted: true` for private clubs where the viewer is not an accepted member or creator

### 7. Join Club

**POST** `/api/clubs/joinClub`

```json
{
  "club_id": 12
}
```

Behavior:
- public club -> membership becomes `accepted`
- private club -> membership becomes `pending`

Frontend should immediately update CTA state:
- accepted -> `Leave club`
- pending -> `Request pending`

### 8. Cancel Join Request

**POST** `/api/clubs/cancelJoinRequest`

```json
{
  "club_id": 12
}
```

Use only for a pending private-club request.

### 9. Leave Club

**POST** `/api/clubs/leaveClub`

```json
{
  "club_id": 12
}
```

Rules:
- normal accepted member can leave
- creator cannot leave their own club

### 10. Remove Member

**POST** `/api/clubs/removeMember`

```json
{
  "club_id": 12,
  "user_id": 99
}
```

Creator only.

### 11. Get Club Members

**POST** `/api/clubs/getClubMembers`

```json
{
  "club_id": 12,
  "search": "ali",
  "sort_by": "most_peaks",
  "limit": 20,
  "offset": 0
}
```

Supported `sort_by`:
- `most_peaks`
- `recent_activity`
- `joined_at`
- `name`

Private-club restriction:
- only accepted members or creator can access

Response member fields:
- `user_id`
- `user_name`
- `user_image`
- `role`
- `joined_at`
- `distinct_peak_count`
- `highest_peak_elevation`
- `recent_activity_at`

### 12. Get Pending Join Requests

**POST** `/api/clubs/getPendingJoinRequests`

```json
{
  "club_id": 12,
  "limit": 20,
  "offset": 0
}
```

Creator only.

Use this for a moderation panel in the club admin UI.

### 13. Accept Join Request

**POST** `/api/clubs/acceptJoinRequest`

```json
{
  "club_id": 12,
  "user_id": 99
}
```

Creator only.

### 14. Reject Join Request

**POST** `/api/clubs/rejectJoinRequest`

```json
{
  "club_id": 12,
  "user_id": 99
}
```

Creator only.

### 15. Club Leaderboard

**POST** `/api/clubs/getClubLeaderboard`

```json
{
  "club_id": 12,
  "metric": "distinct_peaks",
  "date_from": "2026-01-01",
  "date_to": "2026-12-31",
  "limit": 20,
  "offset": 0
}
```

Supported `metric`:
- `distinct_peaks`
- `total_ascents`
- `highest_peak`
- `recent_distinct_peaks`

Important behavior:
- `date_from` / `date_to` only apply to dated route completions
- all-time `distinct_peaks` includes manual peaks
- date-range leaderboards exclude manual peaks without route dates

Private-club restriction:
- only accepted members or creator can access

Each leaderboard row includes:
- `rank`
- `user_id`
- `user_name`
- `user_image`
- `role`
- `joined_at`
- `distinct_peak_count`
- `total_ascents`
- `highest_peak_elevation`
- `recent_activity_at`
- `recent_distinct_peak_count`

### 16. Club Stats

**POST** `/api/clubs/getClubStats`

```json
{
  "club_id": 12
}
```

Private-club restriction:
- only accepted members or creator can access

### 17. Clubs Leaderboard

**POST** `/api/clubs/getClubsLeaderboard`

```json
{
  "visibility": "public",
  "sort_by": "most_peaks",
  "limit": 20,
  "offset": 0
}
```

Supported `sort_by`:
- `most_users`
- `most_peaks`
- `most_active_last_30d`
- `newest`

Use this for:
- leaderboard tab
- discovery home sections
- “top clubs” carousel

### 18. Club Activity

**POST** `/api/clubs/getClubActivity`

```json
{
  "club_id": 12,
  "limit": 20,
  "offset": 0
}
```

Private-club restriction:
- only accepted members or creator can access

Response item shape:

```json
{
  "route_id": 555,
  "route_name": "Morning ridge loop",
  "activity_date": "2026-04-21T08:00:00.000Z",
  "user": {
    "id": 99,
    "name": "Alice",
    "image": "https://..."
  },
  "peak": {
    "id": 1234,
    "name": "Aneto",
    "name_en": "Aneto",
    "elevation": 3404,
    "image": "https://..."
  }
}
```

## Suggested Frontend Screens

Implement at least these screens/features:

### 1. Clubs Browse Page
- search input
- visibility filter
- sort selector
- paginated or infinite-scroll clubs grid/list
- cards showing:
  - image
  - name
  - description
  - visibility badge
  - member count
  - distinct peak count when not restricted
  - creator info
  - join/pending/member state

### 2. Club Details Page
- hero/header with image, name, description
- creator block
- visibility badge
- membership CTA area
- stats summary
- tabs:
  - members
  - leaderboard
  - activity
  - requests/admin if creator

For restricted private clubs:
- still show basic header
- hide members/leaderboard/activity content
- show message like: `Join this private club to view member rankings and activity`

### 3. My Clubs Page
Suggested sections:
- Created by me
- Joined clubs
- Pending requests

### 4. Create Club Flow
- form with image upload
- name
- description
- visibility radio/select
- optimistic redirect to the new club page after success

### 5. Edit Club Flow
- only visible if `is_creator === true`
- allow replacing image
- allow changing visibility
- include delete action

### 6. Club Members Tab
- search
- sort
- creator badge
- remove button only for creator and only on non-creator members

### 7. Club Leaderboard Tab
- metric selector
- optional date-range picker
- leaderboard list/table
- highlight current user if present

### 8. Club Requests/Admin Tab
- creator only
- pending request list
- accept/reject actions

### 9. Clubs Leaderboard Page
- global ranking of clubs
- filters for visibility and sort

## UI State Rules

Map CTA state like this:

- no membership:
  - public club -> `Join club`
  - private club -> `Request to join`
- `membership.status === "pending"`:
  - show `Request pending`
  - show secondary action `Cancel request`
- `membership.status === "accepted"` and not creator:
  - show `Leave club`
- `is_creator === true`:
  - show `Edit club`
  - show admin tools

## Permissions Matrix

### Anonymous user
- can browse clubs
- can open club detail
- cannot join
- cannot see private-club protected content

### Authenticated non-member
- can browse clubs
- can join public clubs
- can request private clubs
- cannot see private-club protected content

### Accepted member
- can view private club full detail
- can view members, leaderboard, activity
- can leave the club
- cannot edit or moderate

### Creator
- can edit club
- can delete club
- can remove members
- can accept/reject requests
- cannot leave own club

## Error Handling

Handle these cases explicitly in UI:

- `401`
  - prompt sign-in
- `403`
  - show permission/restriction message
- `404`
  - show not-found state
- `400`
  - validation error toast or inline form error
- `500`
  - retry state / error toast

Common validation errors:
- `Club name is required`
- `Club description is required`
- `A club image is required`
- `You do not have permission to edit this club`
- `You do not have permission to view club members`
- `Creator cannot leave their own club`
- `Join request already pending`

## Recommended Frontend Types

```ts
type ClubVisibility = "public" | "private";
type ClubMembershipStatus = "accepted" | "pending" | "rejected";
type ClubRole = "creator" | "member";

interface ClubMembership {
  status: ClubMembershipStatus;
  role: ClubRole;
  requested_at: string | null;
  joined_at: string | null;
  responded_at: string | null;
}

interface ClubSummary {
  id: number;
  name: string;
  description: string;
  image: string | null;
  visibility: ClubVisibility;
  created_at: string;
  updated_at: string | null;
  creator: {
    id: number;
    name: string | null;
    image: string | null;
  };
  member_count: number;
  distinct_peak_count?: number;
  membership: ClubMembership | null;
  is_creator: boolean;
  restricted: boolean;
}
```

## Suggested Implementation Order

1. Add API client methods for all `/api/clubs` endpoints
2. Add shared club types and mapping utilities
3. Build browse page and card component
4. Build club details page with CTA state handling
5. Add create/edit/delete flows
6. Add members tab
7. Add leaderboard tab
8. Add creator moderation tab for pending requests
9. Add my clubs page
10. Add clubs leaderboard page

## Notes for the Frontend Agent

- Use `multipart/form-data` for create and update when sending images
- Do not assume private clubs expose leaderboard/member/activity data unless membership is accepted
- Treat `restricted: true` as a first-class UI state
- Use backend pagination fields instead of deriving pagination client-side
- Prefer re-fetching club detail after join/leave/accept/reject actions so counts and membership state stay correct
