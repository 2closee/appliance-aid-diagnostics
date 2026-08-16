# Live Map for Ovapass: Rider Navigation + Customer Tracking

## Answer first: what exists today

Verified in the code and database:

- The rider dashboard (`/rider`) shows the pickup and drop-off **as text addresses only**. There is no map and no directions.
- The rider app **does** already send its GPS position every 20 seconds while online (writes to `riders.last_lat/last_lng` and a `rider_locations` history table), so the location data is being collected.
- A Mapbox map component exists (`DeliveryMapView`) with pickup/drop-off/driver pins, route line and ETA — but it is only wired into an old third-party delivery tracker that is **not rendered anywhere in the app**, and it reads courier location from third-party status history, not from Ovapass riders.
- Customers **cannot** see a rider's position at all: the `riders` and `rider_locations` tables only allow the rider themselves and admins to read. So live customer tracking is currently impossible even though the pings exist.

So: the plumbing is half-built, the map is unused, and the customer side is blocked by access rules. Below is what to build.

## What we build

### 1. Rider live navigation map (`/rider`)
On the active trip card, add a map above the action button:

- Shows the rider's own live position, and the **current target** — pickup point while heading to pickup, drop-off point after collection.
- Draws the road route with distance and ETA to that target, refreshed as the rider moves.
- Recentres on the rider automatically, with a "recentre" button when the rider pans away.
- A prominent "Open in Google Maps / Apple Maps" button for turn-by-turn voice navigation (in-app maps cannot do voice guidance; phone nav apps do this best).
- Same map is used for both legs: device pickup (customer → center) and device return (center → customer), driven by the trip's leg type.

### 2. Customer live tracking (customer dashboard / job detail)
When an Ovapass trip is active for the customer's repair job:

- A live map showing the rider's moving position, the pickup point and the destination, plus ETA and a status line ("Rider is 4 minutes away").
- Rider name, bike and plate, a call button, and the handover code.
- Appears for both directions: when the device is being picked up, and when it is being returned.
- Disappears/locks once the trip is completed.

### 3. Repair center view
The existing "Ovapass rider" card on the job page gains the same live map and ETA, so the center knows when the rider will arrive at the shop.

## Technical details

- **Secure position sharing:** add a `security definer` function (e.g. `get_trip_rider_position(trip_id)`) that returns only `lat`, `lng`, `updated_at`, rider first name, bike and plate — and only to the job's customer, the job's center staff, the assigned rider, or an admin, and only while the trip is active. No new open access on `riders`/`rider_locations`.
- **Live updates:** enable Realtime on the rider position source and subscribe per trip; subscriptions live in `useEffect` with `removeChannel` cleanup. Fall back to a 20s poll of the function if Realtime is unavailable.
- **Ping cadence:** keep 20s pings when idle, tighten to ~8s while the rider has an active trip so the customer sees smooth movement; stop when offline or trip ends.
- **Map layer:** reuse and refactor `DeliveryMapView` into a shared `LiveTripMap` component taking rider position, origin, destination and mode (`rider` vs `watcher`). Token continues to come from the existing `get-mapbox-token` edge function.
- **Coordinates:** `overpass_trips` already stores `pickup_lat/lng` and `dropoff_lat/lng`; geocode on trip creation as a fallback when those are null so the map never depends on client-side geocoding.
- **Battery/permission handling:** clear prompts when location permission is denied, and a plain "waiting for rider signal" state when the last ping is older than 2 minutes.
