# Restore FixBudi web push registration

## Confirmed findings

1. **The linked connection does not contain the browser configuration.** The Firebase connection is active and exposes the project ID (`fixbudi`) plus the service account used for sending, but its configuration does not contain the Web API key, Web App ID, or public VAPID key.
2. **The project environment did not receive the four browser values.** The app expects `WEB_API_KEY`, `PROJECT_ID`, `APP_ID`, and `VAPID_KEY` under the Firebase Messaging connector names. Only the server-side Firebase connection key is present.
3. **The published app was built without those browser values.** The deployed JavaScript contains the project identifier but no Firebase Web API key or Web App ID. Because these values are inserted while building the app, adding them after the last publish does not update an existing release.
4. **No device completed registration.** The push subscription table currently has zero rows, and the push-sending function has no delivery logs. The successful Firebase validation test only proved that server-side sending credentials work; it did not test browser registration or delivery.
5. **The on-screen warning is therefore accurate.** The app checks all four browser values before requesting notification permission and intentionally displays “Push isn't configured yet” when any one is absent.

## Why correctly entered values may still be missing

- The values were added to Firebase Console but not saved through the Firebase Messaging connection with **Include web push** enabled.
- An existing server-only connection was selected again instead of creating or updating a connection that includes web push.
- The connection update saved the service account but failed to persist or synchronize its optional browser fields.
- The values were added as Supabase/server secrets or under different names. Browser code only receives the connector-provided `VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_*` values.
- The connection was updated after the current preview/published build. Vite embeds browser configuration at build time, so a fresh build and publish are required.
- The wrong Firebase Web App was used, or the App ID does not have the expected `1:<sender-id>:web:<hash>` format.
- The VAPID key supplied was not the **public** Web Push certificate key from the same Firebase project.
- The connection belongs to another workspace/project, or the updated connection was not the one linked to FixBudi.
- An installed PWA or open browser tab may still be running an older cached bundle after the configuration is corrected.

## Reliability fixes

1. Recreate or update the linked Firebase Messaging connection with web push included, then verify that all four public browser variable names are actually synchronized before changing app code.
2. Rebuild and republish FixBudi so the browser values are embedded in the released app; verify them from runtime configuration without exposing their values.
3. Remove the service-worker conflict: FixBudi currently has both the PWA worker and Firebase worker competing for the root scope. Use one coordinated worker strategy so PWA updates cannot displace Firebase messaging.
4. Improve registration diagnostics so the notification page identifies the exact missing field or Firebase registration error instead of returning one generic message.
5. Make token persistence resilient when the same browser is used by different accounts; the current token-conflict path can be rejected by access rules and shown only as a generic failure.
6. Add a configuration health check covering connection sync, service-worker state, browser permission, token creation, subscription storage, and server delivery.
7. Validate end to end on a signed-in physical device from the published app: enable notifications, confirm one subscription is stored, send a test, verify foreground and background delivery, then confirm stale-token cleanup.

## Success criteria

- The notification page no longer reports missing Firebase configuration.
- Enabling notifications creates exactly one current device subscription for the signed-in user.
- A test notification arrives while FixBudi is open and while it is in the background.
- The installed app continues receiving notifications after refresh and app restart.