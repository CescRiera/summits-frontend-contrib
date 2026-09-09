# Shelter Change Petition API

Users can submit petitions to **create new shelters** or **edit existing ones**. Petitions go into a review queue (`pending_shelter_changes` table) and are manually approved/rejected by admins via the admin dashboard.

---

## Endpoint

### `POST /api/shelters/submitShelterChange`

Submit a petition to create or edit a shelter.

**Rate limit:** 10 requests per 24 hours per IP.
**Note:** `admin_hierarchy` is not accepted as input — the backend always resolves it automatically from the submitted coordinates. `wikidata_id` is also auto-resolved if a `wikipedia` URL is provided.

**Content-Type:** `multipart/form-data`

#### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | **yes** | `"create"` or `"edit"` |
| `shelter_id` | number | for `edit` | ID of the existing shelter to modify |
| `name` | string | for `create` | Shelter name |
| `name_en` | string | no | English name (optional) |
| `shelter_type` | string | for `create` | One of: `alpine_hut`, `wilderness_hut`, `camp_site`, `shelter` |
| `lat` | number | for `create` | Latitude (decimal degrees) |
| `lng` | number | for `create` | Longitude (decimal degrees) |
| `elevation` | number | no | Elevation in meters |
| `wikipedia` | string | no | Full Wikipedia URL (e.g. `https://en.wikipedia.org/wiki/Refuge_du_Goûter`). The backend auto-resolves the Wikidata ID from this URL. |
| `tags` | string (JSON) | no | JSON string of OSM-style tags (see example below) |
| `email` | string | no | Email to notify when the petition is approved or rejected |
| `reason` | string | no | Reason for the change (useful for edits) |
| `image` | file | no | Single image file (JPEG, PNG, GIF, or WebP). Max 1200px, compressed to ~500KB. |

#### Example Request (create)

```
POST /api/shelters/submitShelterChange
Content-Type: multipart/form-data

type: create
name: Refugio de Test
name_en: Test Shelter
shelter_type: alpine_hut
lat: 42.1234
lng: 1.5678
elevation: 2500
wikipedia: https://en.wikipedia.org/wiki/Refuge_de_Test
email: user@example.com
tags: {"capacity":"12","beds":"10","drinking_water":"yes","fee":"no"}
image: @shelter_photo.jpg
```

#### Example Request (edit)

```
POST /api/shelters/submitShelterChange
Content-Type: multipart/form-data

type: edit
shelter_id: 567
name: Refugio Nombre Actualizado
tags: {"capacity":"20","toilets":"yes"}
reason: Corrected capacity from official source
```

#### Tags Reference

The `tags` field accepts a JSON string with OSM-style key-value pairs. Common tags:

| Key | Example Values | Description |
|-----|---------------|-------------|
| `capacity` | `"12"` | Maximum capacity (persons) |
| `beds` | `"10"` | Number of beds |
| `toilets` | `"yes"`, `"no"`, `" composting"` | Toilet availability |
| `drinking_water` | `"yes"`, `"no"` | Drinking water available |
| `shower` | `"yes"`, `"no"` | Shower available |
| `electricity` | `"yes"`, `"no"` | Electricity available |
| `heating` | `"yes"`, `"no"`, `"fireplace"` | Heating available |
| `fee` | `"yes"`, `"no"` | Fee required |
| `wheelchair` | `"yes"`, `"no"`, `"limited"` | Wheelchair accessible |
| `dogs` | `"yes"`, `"no"` | Dogs allowed |
| `phone` | `"+34..."` | Contact phone |
| `website` | `"https://..."` | Website URL |
| `email` | `"info@..."` | Contact email |
| `opening_hours` | `"Mo-Fr 08:00-18:00"` | Opening hours |
| `operator` | `"FEDME"` | Operating organization |
| `internet_access` | `"yes"`, `"no"`, `"wifi"` | Internet access |
| `description` | `"Mountain hut near..."` | Free-text description |

#### Success Response (200)

```json
{
  "success": true,
  "message": "Shelter change submitted for review",
  "status": "pending",
  "pending_id": 42,
  "type": "create"
}
```

#### Error Responses

| Status | Meaning |
|---|---|
| 400 | Missing required fields, invalid type, or invalid shelter_type |
| 404 | Shelter not found (for edit) |
| 429 | Rate limit exceeded (10/day) |
| 500 | Server error (image processing, DB, etc.) |

---

## Database Table

### `pending_shelter_changes`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment ID |
| `type` | VARCHAR(10) | `'create'` or `'edit'` |
| `shelter_id` | INTEGER | `NULL` for creates, target shelter ID for edits |
| `data` | JSONB | Proposed shelter fields |
| `images` | JSONB | Array of `{ image_url, original_name }` |
| `status` | VARCHAR(20) | `'pending'`, `'approved'`, or `'rejected'` |
| `email` | TEXT | Optional email to notify the user on approve/reject |
| `admin_notes` | TEXT | Admin's rejection reason or notes |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |
| `reviewed_at` | TIMESTAMPTZ | Review timestamp |
| `reviewed_by` | TEXT | Admin identifier (optional) |

### Example `data` JSONB for a Create Petition

```json
{
  "name": "Refugio del Goûter",
  "name_en": "Goûter Hut",
  "type": "alpine_hut",
  "lat": 45.8326,
  "lng": 6.8652,
  "elevation": 3817,
  "wikipedia": "https://en.wikipedia.org/wiki/Refuge_du_Go%C3%BBter",
  "wikidata_id": "Q2063837",
  "tags": {
    "capacity": "120",
    "beds": "120",
    "drinking_water": "yes",
    "fee": "yes",
    "operator": "Club alpin français"
  },
  "admin_hierarchy": {
    "2": "France",
    "4": "Auvergne-Rhône-Alpes"
  },
  "searchable_text": "refuge du gouter"
}
```

The `admin_hierarchy` and `wikidata_id` are auto-resolved by the backend — the frontend should NOT send them.

### Example `data` JSONB for an Edit Petition

```json
{
  "name": "Refugio del Goûter (Actualizado)",
  "tags": {
    "capacity": "130",
    "beds": "130",
    "drinking_water": "yes",
    "fee": "yes",
    "toilets": "yes",
    "operator": "Club alpin français"
  },
  "reason": "Updated capacity per 2025 renovation"
}
```
