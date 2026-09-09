# Shelters API Documentation

Shelters represent mountain infrastructure: alpine huts, wilderness huts, and basic shelters. Data comes from OpenStreetMap.

---

## Shelter Types

The `shelter_type` field can be one of:

| Value | Description |
|---|---|
| `alpine_hut` | Staffed mountain hut with beds, typically above treeline |
| `wilderness_hut` | Remote unstaffed shelter, often self-service |
| `shelter` | Basic three-sided or open shelter |

---

## Search Integration (Realtime)

**Endpoint:** `POST /api/search/searchRealTime`

Shelters are now included in the global realtime search alongside peaks, users, admins, mountain ranges, and clubs.

**Request:**

```json
{
  "q": "refugio",
  "limit": 25
}
```

**Response — shelter results look like this:**

```json
{
  "type": "shelter",
  "shelter_type": "alpine_hut",
  "id": 1234,
  "name": "Refugio de Aneto",
  "name_en": "Aneto Refuge",
  "elevation": 3100,
  "lat": 42.6981,
  "lng": 0.7423,
  "image": "https://cdn.summitstracker.com/shelters/...",
  "admin_hierarchy": [
    { "name": "Spain", "level": 2 },
    { "name": "Aragon", "level": 4 }
  ],
  "relevance_score": 85.5
}
```

**Fields returned for shelters:**

| Field | Type | Description |
|---|---|---|
| `type` | string | Always `"shelter"` |
| `shelter_type` | string | One of `alpine_hut`, `wilderness_hut`, `shelter` |
| `id` | integer | Shelter ID (use this to call detail endpoints) |
| `name` | string | Primary name |
| `name_en` | string \| null | English name (if available) |
| `elevation` | integer \| null | Elevation in meters |
| `lat` | number | Latitude |
| `lng` | number | Longitude |
| `image` | string \| null | Image URL (processed through CDN) |
| `admin_hierarchy` | array | Administrative region hierarchy (country, region, etc.) |
| `relevance_score` | number | Search ranking score (higher = more relevant) |

**Notes:**
- Shelter search uses the same query patterns as peaks: exact match, prefix match, contains, and trigram similarity
- Results are limited to 10 shelters per search
- Relevance is boosted by exact name matches and elevation
- The `id` field is the shelter ID used by all detail endpoints below

---

## Detail Endpoints

All detail endpoints use `POST` method and accept the shelter ID in the request body.

---

### `POST /api/shelters/getBasic`

Returns core shelter information.

**Request:**

```json
{
  "shelter_id": 1234
}
```

**Response:**

```json
{
  "id": 1234,
  "type": "alpine_hut",
  "coordinates": { "lat": 42.6981, "lng": 0.7423 },
  "name": "Refugio de Aneto",
  "name_en": "Aneto Refuge",
  "elevation": 3100,
  "admin_hierarchy": {
    "2": "Spain",
    "4": "Aragon"
  },
  "wikidata_id": "Q12345",
  "wikipedia": "en:Aneto_Refuge",
  "image": "https://cdn.summitstracker.com/shelters/...",
  "osm_id": 123456789,
  "osm_type": "node",
  "reverse_geocoding": {
    "city": "Benasque",
    "region": "Aragon",
    "country": "Spain",
    "country_code": "ES",
    "continent": "Europe"
  },
  "country_flag": "https://flagcdn.com/w80/es.png"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | integer | Shelter ID |
| `type` | string | Shelter type (`alpine_hut`, `wilderness_hut`, `shelter`) |
| `coordinates` | object | `{ lat, lng }` |
| `name` | string \| null | Primary name |
| `name_en` | string \| null | English name |
| `elevation` | integer \| null | Elevation in meters |
| `admin_hierarchy` | object | Region hierarchy keyed by admin level |
| `wikidata_id` | string \| null | Wikidata entity ID |
| `wikipedia` | string \| null | Wikipedia link (format: `lang:Page_Title`) |
| `image` | string \| null | Image URL |
| `osm_id` | integer | OpenStreetMap node/way/relation ID |
| `osm_type` | string | OSM element type (`node`, `way`, `relation`) |
| `reverse_geocoding` | object | Location info from BigDataCloud |
| `country_flag` | string \| null | Country flag image URL |

---

### `POST /api/shelters/getDescription`

Returns Wikipedia/Wikidata description for the shelter.

**Request:**

```json
{
  "shelter_id": 1234,
  "language": "en"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `shelter_id` | integer | yes | Shelter ID |
| `language` | string | no | Preferred language code (default: `"en"`) |

**Response:**

```json
{
  "shelter_id": 1234,
  "description": "The Aneto Refuge is a mountain hut in the Pyrenees...",
  "language": "en",
  "lang_codes": ["en", "es", "fr"],
  "source": "wikipedia",
  "name": "Refugio de Aneto"
}
```

| Field | Type | Description |
|---|---|---|
| `description` | string \| null | Description text |
| `language` | string \| null | Selected language code |
| `lang_codes` | string[] | Available Wikipedia language editions |
| `source` | string \| null | `"wikipedia"` or `"wikidata"` |
| `name` | string \| null | Shelter name |

---

### `POST /api/shelters/getImages`

Returns images from the database plus Wikipedia/Wikidata.

**Request:**

```json
{
  "shelter_id": 1234
}
```

**Response:**

```json
{
  "shelter_id": 1234,
  "shelter_name": "Refugio de Aneto",
  "coordinates": { "lat": 42.6981, "lng": 0.7423 },
  "images": [
    {
      "title": "Refugio de Aneto in winter",
      "url": "https://upload.wikimedia.org/...",
      "width": 1200,
      "height": 800,
      "source": "wikipedia"
    }
  ],
  "total_images": 3,
  "wikipedia_url": "https://en.wikipedia.org/wiki/Aneto_Refuge",
  "wikidata_id": "Q12345"
}
```

| Field | Type | Description |
|---|---|---|
| `images` | array | Array of image objects |
| `images[].title` | string | Image title |
| `images[].url` | string | Image URL |
| `images[].width` | integer \| null | Width in pixels |
| `images[].height` | integer \| null | Height in pixels |
| `images[].source` | string | `"local"`, `"wikipedia"`, or `"wikidata"` |
| `total_images` | integer | Total image count |
| `wikipedia_url` | string \| null | Full Wikipedia URL |
| `wikidata_id` | string \| null | Wikidata entity ID |

---

### `POST /api/shelters/getAdditionalInfo`

Returns facility details extracted from OSM tags.

**Request:**

```json
{
  "shelter_id": 1234
}
```

**Response:**

```json
{
  "shelter_id": 1234,
  "shelter_name": "Refugio de Aneto",
  "coordinates": { "lat": 42.6981, "lng": 0.7423 },
  "type": "alpine_hut",
  "facilities": {
    "capacity": 30,
    "beds": 24,
    "toilets": "yes",
    "drinking_water": "yes",
    "shower": "no",
    "electricity": "yes",
    "heating": "wood",
    "fireplace": "yes",
    "fee": "yes",
    "wheelchair": "no",
    "pets": "no",
    "phone": null,
    "website": "https://refugedeAneto.es",
    "email": null,
    "opening_hours": "Jun-Sep",
    "operator": "Federación de Aragón",
    "internet_access": "no",
    "description": "Staffed mountain hut open in summer"
  },
  "tags": { "...": "raw OSM tags" }
}
```

| Field | Type | Description |
|---|---|---|
| `facilities` | object | Parsed facility data (see below) |
| `tags` | object | Raw OSM tags (all key-value pairs) |

**Facilities fields (extracted from tags by the backend):**

| Field | Type | Description |
|---|---|---|
| `capacity` | integer \| null | Total capacity |
| `beds` | integer \| null | Number of beds |
| `toilets` | string \| null | Toilet availability |
| `drinking_water` | string \| null | Water availability |
| `shower` | string \| null | Shower availability |
| `electricity` | string \| null | Electricity availability |
| `heating` | string \| null | Heating type |
| `fireplace` | string \| null | Fireplace availability |
| `fee` | string \| null | Whether there's a fee |
| `wheelchair` | string \| null | Wheelchair accessibility |
| `pets` | string \| null | Pet policy |
| `phone` | string \| null | Phone number |
| `website` | string \| null | Website URL |
| `email` | string \| null | Contact email |
| `opening_hours` | string \| null | Opening hours |
| `operator` | string \| null | Operating organization |
| `internet_access` | string \| null | Internet availability |
| `description` | string \| null | OSM description |

---

## Full Tags Reference (raw OSM data)

The `tags` object returned by `getAdditionalInfo` contains all raw OSM tags for the shelter. Below is every tag that appears across all 83,863 shelters in the database, grouped by category and sorted by frequency.

> **Note:** Tags with `null` or empty values are excluded from individual shelter responses. Not every shelter has every tag — most tags are sparse.

### Shelter Identity & Classification

| Tag | Shelters | Example Values |
|---|---|---|
| `name` | 47.9% | `Kreealm Bichlhütte`, `Heinrich-Hueter-Hütte` |
| `alt_name` | 1.6% | `Alpengasthof Strassberg`, `Rablkreuz-Hütte` |
| `name:en` | 2.1% | `Totalalp hut`, `Kautsi forest hut` |
| `name:de` | 0.4% | German localized name |
| `name:es` | 0.4% | Spanish localized name |
| `name:fr` | 0.3% | French localized name |
| `name:it` | 0.2% | Italian localized name |
| `int_name` | 0.2% | International name |
| `loc_name` | 0.2% | Local name |
| `old_name` | 0.2% | Previous name |
| `short_name` | 0.1% | Shortened name |
| `official_name` | 0.1% | Official name |
| `description` | 6.1% | Free-text description |
| `description:en` | 0.7% | English description |
| `description:de` | 0.0% | German description |
| `description:fr` | 0.2% | French description |
| `description:it` | 0.1% | Italian description |

### OSM Type Tags

| Tag | Shelters | Example Values |
|---|---|---|
| `amenity` | 65.8% | `shelter`, `restaurant`, `alp`, `fast_food` |
| `shelter_type` | 64.6% | `weather_shelter`, `lean_to`, `basic_hut`, `building` |
| `tourism` | 37.4% | `wilderness_hut`, `alpine_hut`, `information`, `picnic_site` |
| `building` | 42.3% | `house`, `yes`, `roof`, `cabin` |
| `historic` | 1.1% | `heritage`, `wayside_shrine`, `building` |

### Capacity & Sleeping

| Tag | Shelters | Example Values |
|---|---|---|
| `capacity` | 6.4% | `80`, `150`, `8`, `34` |
| `capacity:persons` | 0.6% | `12`, `4`, `6`, `7` |
| `capacity:beds` | 0.1% | Number of beds |
| `beds` | 1.5% | `10`, `20`, `3`, `48` |
| `mattress` | 2.0% | `yes`, `no`, `1`, `8` |
| `sleeping` | 1.0% | `possible`, `yes`, `no`, `dedicated` |
| `sleeping:protection` | 0.0% | Protection type for sleeping |
| `bivac_room` | 0.0% | Bivouac room info |
| `bivac_room:access` | 0.0% | Access rules |
| `bivac_room:heating` | 0.0% | Heating in bivouac |
| `winter_room` | 0.4% | Winter room availability |
| `capacity:winter_room` | 0.3% | Winter room capacity |
| `capacity:winter` | 0.0% | Winter capacity |
| `capacity:overnight` | 0.0% | Overnight capacity |
| `couch` | 0.0% | Couch availability |
| `cabins` | 0.0% | Number of cabins |
| `rooms` | 0.4% | Number of rooms |
| `rooms:family` | 0.1% | Family rooms |

### Facilities & Amenities

| Tag | Shelters | Example Values |
|---|---|---|
| `fireplace` | 10.6% | `yes`, `no`, `none`, `stove` |
| `stove` | 1.0% | `no`, `yes`, `wood`, `gas` |
| `drinking_water` | 3.3% | `yes`, `no`, `seasonal`, `rainwater_tank` |
| `drinking_water:legal` | 0.0% | Legal access to water |
| `drinking_water:refill` | 0.0% | Refill station info |
| `toilets` | 2.7% | `yes`, `no`, `separate`, `customers` |
| `toilets:disposal` | 1.1% | `pitlatrine`, `flush`, `composting` |
| `toilets:access` | 0.0% | Access level |
| `toilets:wheelchair` | 0.1% | Wheelchair-accessible toilets |
| `shower` | 1.6% | `yes`, `no`, `cold`, `hot` |
| `electricity` | 0.2% | `yes`, `no`, `solar`, `grid` |
| `heating` | 0.3% | Heating type |
| `kitchen` | 0.5% | Kitchen availability |
| `cooking` | 0.0% | Cooking facilities |
| `cookware` | 0.0% | Available cookware |
| `cooker` | 0.0% | Stove/cooker |
| `cooker:fuel` | 0.0% | Fuel type for cooker |
| `dish_washing` | 0.0% | Dish washing facility |
| `openfire` | 0.1% | Open fire pit |
| `firepit` | 0.0% | Firepit |
| `bbq` | 0.0% | Barbecue |
| `barbecue_grill` | 0.0% | BBQ grill |
| `wood_provided` | 0.2% | Firewood provided |
| `gas` | 0.2% | Gas availability |

### Furniture & Comfort

| Tag | Shelters | Example Values |
|---|---|---|
| `bench` | 11.1% | `yes`, `no`, `2`, `3` |
| `table` | 1.3% | `no`, `yes`, `3`, `2` |
| `chair` | 0.0% | Chair |
| `chairs` | 0.0% | Number of chairs |
| `seats` | 0.2% | Number of seats |
| `backrest` | 0.3% | Bench backrest |
| `covered` | 0.2% | Covered/roofed area |
| `curtain` | 0.1% | Curtain |
| `window` | 0.1% | Window |
| `door` | 0.2% | Door |
| `door:type` | 0.0% | Door type |
| `floor` | 0.1% | Floor info |
| `floor:material` | 1.2% | `concrete`, `paving_stones`, `gravel`, `wood` |
| `carpet` | 0.0% | Carpet |
| `lit` | 1.8% | `no`, `yes`, `automatic` |
| `umbrella` | 0.0% | Umbrella |
| `outdoor_seating` | 0.4% | Outdoor seating |
| `indoor_seating` | 0.1% | Indoor seating |
| `picnic_table` | 0.5% | `yes`, `no` |
| `bin` | 6.2% | `yes`, `no`, `separate` |
| `bookshelf` | 0.0% | Bookshelf |

### Access & Reservations

| Tag | Shelters | Example Values |
|---|---|---|
| `access` | 5.9% | `yes`, `private`, `members`, `customers` |
| `reservation` | 5.4% | `members_only`, `required`, `yes`, `no` |
| `booking` | 0.0% | Booking info |
| `website:booking` | 0.1% | Booking website |
| `reservation:website` | 0.2% | Reservation website |
| `opening_hours` | 1.4% | `"Ist geschlossen"`, `Jun-Sep; Tu-Su` |
| `opening_hours:kitchen` | 0.0% | Kitchen hours |
| `seasonal` | 0.0% | Seasonal availability |
| `locked` | 0.8% | `no`, `yes` |
| `lockable` | 2.2% | `no`, `yes` |
| `dnt:lock` | 0.6% | `yes`, `no`, `special key` |
| `backcountry` | 0.1% | Backcountry access |
| `group_only` | 0.1% | Group-only access |
| `access:permit` | 0.0% | Permit required |
| `access:note` | 0.0% | Access notes |

### Contact Information

| Tag | Shelters | Example Values |
|---|---|---|
| `phone` | 4.1% | `+43 5556 76570`, `+43 664 9170441` |
| `contact:phone` | 0.6% | `+43 676 8429 27 136` |
| `email` | 2.0% | `info@hueterhuette.at` |
| `contact:email` | 0.4% | `info@ansbacherhuette.at` |
| `website` | 10.9% | `https://hueterhuette.at/` |
| `contact:website` | 0.5% | `https://www.dav-minden.de/mindener-huette` |
| `url` | 2.9% | Generic URL |
| `contact:facebook` | 0.3% | Facebook page |
| `contact:instagram` | 0.1% | Instagram |
| `contact:whatsapp` | 0.0% | WhatsApp |
| `contact:telegram` | 0.0% | Telegram |
| `contact:twitter` | 0.0% | Twitter |
| `contact:tripadvisor` | 0.0% | TripAdvisor |
| `contact:youtube` | 0.0% | YouTube |
| `fax` | 0.1% | Fax number |
| `mobile` | 0.2% | Mobile phone |
| `contact:person` | 0.2% | Contact person |
| `contact:mobile` | 0.2% | Mobile contact |
| `contact:line` | 0.0% | LINE app |
| `contact:sms` | 0.0% | SMS contact |
| `contact:phone2` | 0.0% | Secondary phone |

### Operator & Ownership

| Tag | Shelters | Example Values |
|---|---|---|
| `operator` | 12.2% | `Sektion Vorarlberg`, `DAV`, `DAV Sektion München und Oberland` |
| `operator:type` | 0.2% | Operator type |
| `operator:wikidata` | 1.2% | Wikidata ID for operator |
| `operator:wikipedia` | 1.1% | Wikipedia page for operator |
| `operator:short` | 0.0% | Short operator name |
| `operator:tenant` | 0.1% | Tenant operator |
| `owner` | 0.7% | `ÖAV Vorarlberg`, `Polskie Towarzystwo Turystyczno-Krajoznawcze` |
| `affiliation` | 0.0% | Affiliated organization |
| `network` | 0.9% | `ÖAV`, `M réso`, `Den Norske Turistforening` |
| `club` | 0.0% | Club info |
| `scout` | 0.0% | Scout organization |

### Payment & Fees

| Tag | Shelters | Example Values |
|---|---|---|
| `fee` | 6.8% | `yes`, `no`, `donation`, `15€` |
| `charge` | 0.3% | Specific charge amount |
| `charge:adult` | 0.0% | Adult price |
| `charge:child` | 0.0% | Child price |
| `charge:shower` | 0.0% | Shower price |
| `payment:cash` | 0.5% | Cash accepted |
| `payment:credit_cards` | 0.4% | Credit cards accepted |
| `payment:debit_cards` | 0.2% | Debit cards accepted |
| `payment:electronic_purses` | 0.0% | Electronic purses |
| `payment:contactless` | 0.0% | Contactless payment |
| `payment:prepaid_ticket` | 0.0% | Prepaid tickets |
| `payment:coins` | 0.0% | Coins accepted |
| `currency:EUR` | 0.0% | EUR accepted |
| `currency:CHF` | 0.0% | CHF accepted |
| `currency:USD` | 0.0% | USD accepted |
| `cash_withdrawal` | 0.0% | Cash withdrawal available |
| `cash_withdrawal:fee` | 0.0% | Withdrawal fee |

### Food & Dining

| Tag | Shelters | Example Values |
|---|---|---|
| `cuisine` | 0.8% | `regional`, `austrian`, `alpine_hut`, `local` |
| `restaurant` | 0.0% | Restaurant info |
| `food` | 0.3% | Food availability |
| `breakfast` | 0.3% | Breakfast availability |
| `dinner` | 0.3% | Dinner availability |
| `provisions` | 0.2% | Provision info |
| `drink` | 0.0% | Drinks available |
| `drink:beer` | 0.0% | Beer |
| `drink:coffee` | 0.0% | Coffee |
| `drink:tea` | 0.0% | Tea |
| `drink:wine` | 0.0% | Wine |
| `drink:whisky` | 0.0% | Whisky |
| `beverages` | 0.0% | Beverages |
| `diet:vegetarian` | 0.2% | Vegetarian options |
| `diet:vegan` | 0.1% | Vegan options |
| `diet:gluten_free` | 0.0% | Gluten-free options |

### Building & Structure

| Tag | Shelters | Example Values |
|---|---|---|
| `building:levels` | 2.5% | `2`, `1`, `3`, `5` |
| `building:material` | 0.8% | `wood`, `stone`, `plaster`, `glass` |
| `building:colour` | 0.3% | Building color |
| `building:roof` | 0.0% | Roof type |
| `building:height` | 0.0% | Building height |
| `building:condition` | 0.0% | Condition |
| `building:use` | 0.1% | Building use |
| `building:part` | 0.1% | Part of building |
| `building:year_built` | 0.0% | Year built |
| `building:design` | 0.0% | Design style |
| `building:architecture` | 0.0% | Architecture style |
| `roof:shape` | 1.2% | `half-hipped`, `gabled`, `round`, `hipped` |
| `roof:material` | 0.5% | `metal`, `roof_tiles`, `tar_paper`, `glass` |
| `roof:colour` | 0.4% | Roof color |
| `roof:levels` | 0.4% | Number of roof levels |
| `roof:height` | 0.1% | Roof height |
| `roof:orientation` | 0.2% | Roof orientation |
| `material` | 3.3% | `wood`, `stone`, `camion`, `concrete` |
| `wall` | 0.5% | Wall material |
| `height` | 0.9% | `6.5`, `3`, `2.09`, `6` |
| `min_height` | 0.0% | Minimum height |
| `surface` | 0.9% | `gravel`, `dirt`, `ground`, `concrete` |
| `layer` | 0.8% | `2`, `1`, `-1`, `-2` |
| `start_date` | 1.1% | `1915`, `1845`, `1879`, `1891` |
| `construction_date` | 0.1% | Construction date |
| `abandoned` | 0.1% | Abandoned status |
| `demolished` | 0.0% | Demolished |
| `ruins` | 0.3% | Ruins status |
| `inscribed` | 0.0% | Inscription |

### Accessibility

| Tag | Shelters | Example Values |
|---|---|---|
| `wheelchair` | 1.6% | `no`, `yes`, `limited`, `designated` |
| `blind` | 0.0% | Blind accessibility |
| `deaf` | 0.0% | Deaf accessibility |
| `changing_table` | 0.0% | Baby changing table |
| `defibrillator` | 0.0% | AED available |

### Smoking & Pets

| Tag | Shelters | Example Values |
|---|---|---|
| `smoking` | 0.6% | `no`, `outside`, `isolated`, `yes` |
| `dog` | 0.2% | Dog policy |
| `pets` | 0.1% | Pet policy |

### Internet & Communication

| Tag | Shelters | Example Values |
|---|---|---|
| `internet_access` | 2.2% | `no`, `yes`, `wlan` |
| `internet_access:fee` | 0.5% | Internet fee |
| `communication:mobile_phone` | 0.0% | Mobile signal |
| `communication:radio` | 0.0% | Radio comms |
| `emergency` | 0.1% | Emergency info |
| `emergency:phone` | 0.0% | Emergency phone |
| `emergency_beacon` | 0.0% | Emergency beacon |
| `emergency_box:contact` | 0.0% | Emergency box contact |
| `power_supply` | 0.5% | `yes`, `no`, `solar`, `grid` |

### Address & Location

| Tag | Shelters | Example Values |
|---|---|---|
| `addr:city` | 3.6% | `Hüttschlag`, `Zernez`, `Vandans` |
| `addr:street` | 2.8% | `See`, `Via Pass dal Fuorn` |
| `addr:housenumber` | 3.0% | `23`, `68`, `228` |
| `addr:postcode` | 3.3% | `5612`, `7530`, `6773` |
| `addr:country` | 1.7% | `AT`, `EE`, `CH`, `BE` |
| `addr:place` | 1.3% | `Walchegg`, `Straßberg` |
| `addr:state` | 0.2% | State/province |
| `addr:suburb` | 0.1% | Suburb |
| `addr:hamlet` | 0.0% | Hamlet |
| `addr:neighbourhood` | 0.0% | Neighborhood |
| `addr:district` | 0.0% | District |
| `addr:province` | 0.1% | Province |
| `addr:community` | 0.0% | Community |

### Geo References & Metadata

| Tag | Shelters | Example Values |
|---|---|---|
| `wikidata` | 3.3% | `Q1596429`, `Q21036951` |
| `wikipedia` | 2.1% | `de:Zellerhütte`, `de:Alplhaus` |
| `wikimedia_commons` | 1.2% | `Category:Silberkarhütte` |
| `source` | 8.8% | `geoimage.at`, `microsoft/BuildingFootprints` |
| `source:url` | 0.2% | Source URL |
| `source:name` | 0.1% | Name source |
| `source:ele` | 0.2% | Elevation source |
| `source:image` | 0.0% | Image source |
| `source:geometry` | 0.2% | Geometry source |
| `massif` | 0.2% | `Rätikon` |
| `image` | 2.6% | Image URL |
| `ele` | 10.7% | `1570`, `1776`, `1575` |
| `altitude` | 0.0% | Altitude |
| `elevation` | 0.1% | Elevation |
| `ref` | 1.1% | Reference number |
| `ref:refuges.info` | 3.3% | refuges.info ID |
| `mapillary` | 0.4% | Mapillary imagery |
| `panoramax` | 0.1% | Panoramax imagery |

### Sport & Recreation

| Tag | Shelters | Example Values |
|---|---|---|
| `hiking` | 0.1% | Hiking info |
| `snowmobile` | 1.0% | `yes`, `no`, `permissive` |
| `motorcycle` | 0.5% | Motorcycle access |
| `bicycle` | 0.0% | Bicycle access |
| `piste:tourism` | 0.1% | Piste tourism info |
| `camping` | 0.0% | Camping info |
| `tents` | 0.0% | Tent availability |
| `animal` | 0.0% | Animal info |

### Norwegian System (DNT) Tags

| Tag | Shelters | Example Values |
|---|---|---|
| `dnt:classification` | 0.8% | `betjent`, `nødbu`, `ubetjent`, `selvbetjent` |
| `dnt:iid` | 0.8% | DNT internal ID |
| `dnt:lock` | 0.6% | DNT lock info |
| `dnt:discount` | 0.0% | DNT discount |

### Miscellaneous

| Tag | Shelters | Example Values |
|---|---|---|
| `note` | 2.2% | Free-text notes |
| `fixme` | 1.0% | Needs fixing |
| `check_date` | 1.4% | `2024-01-29`, `2023-07-01` |
| `comment` | 0.1% | Comments |
| `remark` | 0.0% | Remarks |
| `attribution` | 0.1% | Attribution |
| `import` | 0.0% | Import source |
| `deprecated` | 0.0% | Deprecated tag |
| `disused` | 0.0% | Disused |
| `damaged` | 0.0% | Damaged status |
| `condition` | 0.0% | Condition |
| `supervisor` | 0.0% | Supervisor |
| `heritage` | 0.0% | Heritage status |
| `inscription` | 0.1% | Inscription text |
| `designation` | 0.0% | Designation |
| `emergency:shelter_type` | 0.0% | Emergency shelter type |

---

### `POST /api/shelters/getNearbyPeaks`

Returns peaks near the shelter.

**Request:**

```json
{
  "shelter_id": 1234,
  "radius": 10000,
  "limit": 10
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `shelter_id` | integer | yes | Shelter ID |
| `radius` | integer | no | Search radius in meters (default: 10000) |
| `limit` | integer | no | Max results (default: 10) |

**Response:**

```json
{
  "shelter_id": 1234,
  "coordinates": { "lat": 42.6981, "lng": 0.7423 },
  "nearby_peaks": [
    {
      "id": 5678,
      "name": "Aneto",
      "elevation": 3404,
      "distance_km": 2.3,
      "image": "https://cdn.summitstracker.com/peaks/..."
    }
  ]
}
```

---

### `POST /api/shelters/getNearbyShelters`

Returns other shelters near the given shelter.

**Request:**

```json
{
  "shelter_id": 1234,
  "radius": 10000,
  "type": "alpine_hut",
  "limit": 20
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `shelter_id` | integer | yes | Shelter ID |
| `radius` | integer | no | Search radius in meters (default: 10000) |
| `type` | string | no | Filter by shelter type |
| `limit` | integer | no | Max results (default: 20) |

**Response:**

```json
{
  "shelter_id": 1234,
  "coordinates": { "lat": 42.6981, "lng": 0.7423 },
  "type": "alpine_hut",
  "nearby_shelters": [
    {
      "id": 2345,
      "type": "alpine_hut",
      "name": "Refugio de la Renclusa",
      "elevation": 2140,
      "coordinates": { "lat": 42.6812, "lng": 0.7102 },
      "distance_km": 3.1,
      "image": "https://cdn.summitstracker.com/shelters/..."
    }
  ]
}
```

---

## Frontend Integration Notes

### Search Results

When rendering search results, check `item.type`:

- `"shelter"` → render as a shelter card (use `shelter_type` for icon/pill)
- `"peak"` → existing peak card
- `"admin"` → existing admin/region card
- `"mountain_range"` → existing mountain range card
- `"club"` → existing club card
- `"user"` → existing user card

Shelter cards share the same field layout as peaks (`id`, `name`, `name_en`, `elevation`, `lat`, `lng`, `image`, `admin_hierarchy`) plus the extra `shelter_type` field. The frontend can reuse the peak card component with a shelter type badge.

### Shelter Detail Flow

When a user taps a shelter from search results:

1. Call `POST /api/shelters/getBasic` with `{ shelter_id: item.id }` for header data
2. Lazy-load description via `POST /api/shelters/getDescription`
3. Lazy-load images via `POST /api/shelters/getImages` (only when user opens gallery)
4. Lazy-load facilities via `POST /api/shelters/getAdditionalInfo` (only when user expands info section)
5. Lazy-load nearby peaks/shelters on scroll or tab switch

### ETag Caching

The `getBasic`, `getDescription`, `getImages`, and `getAdditionalInfo` endpoints use ETag middleware. Always send `If-None-Match` headers to avoid re-downloading unchanged data.

### Image Handling

- Shelter images go through the same CDN URL processing as peak images
- Some shelters may have no image (check for `null`)
- Wikipedia/Wikidata images are fetched on-demand and cached server-side for 6 hours
