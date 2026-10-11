# Shakil M Voice Rooms

The supplied Bengali voice-room design replaces the previous React interface. The app retains its purple/gold styling, animated frames, entry effects, game cards, room seats, gifts, wallet, profile, moments and messaging. Only the four supplied games remain: Lion Food Wheel, Night Food Wheel, Jackpot Fruit and Slots. Claude artifact links, browser-admin passwords, fake members and browser-minted account coins are removed.

## Verify and publish

```sh
npm ci
npm run lint
npm test
npm run build
```

GitHub Actions publishes `dist` to https://soverixnet-design.github.io/Shakilmgame/. The workflow waits for any legacy branch-based Pages build before publishing compiled assets, preventing the old raw source deployment from overwriting the app.

## Firebase activation — required independently of Pages

The front end being published does **not** mean the backend is deployed. This repository targets project `canvas-library-340ks` and named Firestore database `ai-studio-voxplaysocialhub-25b972ec-15e3-44fc-aa16-09158b2d9f15`. Deploy with an authorized project administrator:

```sh
npm ci --prefix functions
npx firebase-tools login
npx firebase-tools deploy --project canvas-library-340ks --only firestore,functions
```

The function parameter `FIRESTORE_DATABASE_ID` defaults to that named database. Check an existing `.env`/parameter value does not override it with `(default)`. Function deployment requires the project's supported billing setup. Deploy rules, indexes and functions together, and wait for indexes to finish building.

In Firebase Authentication enable **Email/Password** and **Google**, add `soverixnet-design.github.io` to authorized domains, and configure the Google sign-in support email. The app provides sign-in, registration, verification email and password reset.

After the owner creates an account, use its exact Firebase Authentication UID in an administrative environment with Application Default Credentials:

```sh
GOOGLE_CLOUD_PROJECT=canvas-library-340ks node functions/bootstrap-admin.mjs OWNER_FIREBASE_UID
```

Then sign out and back in. Only `superAdmin: true` can grant coins, approve recharge requests or assign/revoke reseller roles. A legacy `admin: true` alone is insufficient. Never put service-account keys or owner passwords in frontend files. This task does not select an owner UID or silently assign privileges to the first registrant.

## Connected features

- **Wallet:** all four embedded games settle on the server with cryptographic randomness, input validation, atomic balances and idempotent request IDs. Child-frame balance reports are ignored. Standalone game files are labelled demo and cannot alter an account wallet.
- **Owner panel:** grant coins to registered users/resellers by resolving their public ID or UID; credit receipts are auditable and idempotent.
- **Reseller panel:** transfer only the reseller's existing balance. Server-owned role checks take effect immediately after revocation.
- **Recharge:** users submit a manual payment reference. Only owner approval adds coins. No payment gateway is configured; submitting the form never charges money or confirms a payment.
- **Invite:** a registration can attribute one inviter. Only an owner-approved recharge earns the inviter 5%; duplicate approvals do not repeat a reward. User-to-user/reseller transfers earn no referral bonus.
- **Gifts:** server catalog prices, sender debit, 70% recipient credit, room gift total and receipt commit together. Both users must be active members of that room.
- **Store:** supplied frame, entry, room-theme and SVIP catalogs use server prices and persistent ownership. Owned items can be reapplied without paying twice; exclusive negative-price items cannot be purchased.
- **Check-in:** 100 coins once per UTC day. No fake tasks or offline balances are imported into the account.
- **Rooms:** create/join, host-only name/notice/category/photo/theme changes, seat requests and approval, seat locking, mute/unmute, remove, ban/unban and host-assigned moderators. Old room seat layouts migrate to the permission-based schema when first joined.
- **Voice:** Firebase signaling/presence and WebRTC audio. Microphone capture requires approved speaking permission; listeners additionally mute remote tracks when permission is revoked. Use the room's speaker button if the browser blocks audio autoplay.
- **Social:** shared moments with compressed images, private messages, profile photos and transaction history use authenticated Firestore data and restrictive rules.

## Remaining operational validation

Automated tests exercise money/role/seat handlers against an in-memory transactional adapter, and game tests include 4,000 randomized settlements plus parsing every embedded script. These tests are **not** Firestore emulator tests. TypeScript and production compilation are separate checks.

No live Firebase mutations, real payment transactions, browser/device visual QA or two-device microphone calls have been performed as part of this source verification. Complete these checks after backend activation:

1. Sign in on two devices. Confirm a normal user cannot directly change balance, role, room metadata or speaking permissions in Firestore.
2. Set exactly the intended owner's claim. Grant coins; assign a reseller; confirm transfers debit the reseller and cannot overdraw. Revoke the role and repeat.
3. Play each game; reload; confirm the ledger and balance match the saved settlement. Retry a request ID and confirm there is no second debit.
4. Request/approve a seat, enable the microphone, then mute/remove/ban from the host account. Confirm the listener stops hearing that speaker.
5. Change room and profile images, purchase/reapply a frame/theme, send a gift and a private message, publish a moment, and verify from the other device.
6. Register through an invite link; reject one recharge, approve another, and retry approval. Only the approved one should credit the inviter once.

STUN alone may fail on restrictive mobile networks. Configure a TURN service through backend-only `TURN_URL` and `TURN_SHARED_SECRET` for short-lived credentials returned by `getVoiceConfig`; test across the actual target networks. WebRTC currently uses a peer mesh intended for small rooms, not a large broadcast service. While a room remains open, clients request a server-checked stale-seat cleanup once a minute; seats whose heartbeat has expired for 150 seconds are released. There is no background scheduler for completely empty rooms.

Existing account balances are preserved rather than silently erased; audit balances and old owner claims before accepting paid balances from the previous implementation. Multi-tab simultaneous sessions share the same room identity.
