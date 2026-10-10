# Shakil Voice Room & Games

React/Vite frontend on GitHub Pages; Firebase Auth, Firestore, and callable Cloud Functions backend.

## Local verification

```sh
npm ci
npm run lint
npm test
npm run build
```

GitHub Actions builds `dist` and deploys it to Pages. Repository Settings → Pages must use **GitHub Actions** as its source. Game URLs are resolved under Vite's configured `/Shakilmgame/` base.

## Required backend deployment

Frontend publication does not deploy Firestore rules or Cloud Functions. Existing database rules remain unchanged until the following deployment succeeds. Use an account with administrative access to the Firebase project in `.firebaserc`; a public Firebase web API key is not sufficient.

```sh
npm ci --prefix functions
npx firebase-tools login
npx firebase-tools deploy --only firestore,functions
```

When asked for `FIRESTORE_DATABASE_ID`, enter the `firestoreDatabaseId` from `firebase-applet-config.json` (not `(default)` unless that is the configured database). Cloud Functions deployment may require billing to be enabled on the Firebase project.

Create the initial owner's role from a trusted machine with Application Default Credentials for the same project:

```sh
node functions/bootstrap-admin.mjs FIREBASE_AUTH_USER_UID
```

Then sign out and back in. Owner claims are `admin: true, superAdmin: true`. Additional admin changes require the owner claim. Admin grant inputs take Firebase UIDs, not email addresses. Admin controls use authenticated callable functions; modifying browser storage cannot grant permission. Save the gift catalog from the admin panel before sending gifts.

In Firebase Authentication, enable Google sign-in and add `soverixnet-design.github.io` to authorized domains.

## Wallet and games

- Guests play with nonredeemable demo coins, separate from the account wallet.
- Signed-in rounds are settled by `playRound` on the server, with cryptographic randomness, validation, atomic balance updates, and idempotent request IDs.
- Gift debit, recipient credit, and the transaction receipt commit atomically.
- Daily bonuses are limited server-side, using the UTC date.
- Admin credits are audited and require server-side claims.
- Purchase buttons do not mint coins. No payment provider or merchant credentials have been configured: online checkout remains unavailable until a provider integration and verified webhook are added.
- The standalone lucky-wheel preview is labelled demo and never changes the wallet.
- Rankings show actual server records, with an empty state instead of invented winners.
- Existing balances from the old insecure implementation are not automatically trusted or migrated. Audit existing balances and roles before accepting purchased balances.

## Voice

Signed-in clients use Firestore signaling and presence to establish WebRTC audio across devices. Both users must open the same persisted public room. Microphone permission and HTTPS are required. Private-room creation is disabled until invitation/member access controls are implemented.

STUN-only connections can fail on restrictive mobile networks. Configure a TURN service with **short-lived** credentials via `getVoiceConfig` (see `functions/index.js`) before depending on universal cross-network voice. Two-device voice testing and deployed Firebase rule/emulator verification are still required; source checks do not prove either works in production.

## Verification performed

TypeScript checks, production build, embedded JavaScript syntax checks, and 10 automated tests (including 4,000 randomized settlement cases). No live wallet mutations or payment transactions were used for testing.
