# Biling Media mobile development

The iOS and Android app lives in `apps/mobile`. It uses Expo SDK 58, React Native 0.88, React 19.3, Expo Router and the workspace's shared contracts and schemas. The native interface uses the official Biling logo and published artwork from the API.

## Install and start

Use Node 22.13 or later for the mobile workspace and the repository's pnpm version from `package.json`. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev:mobile
```

Copy `apps/mobile/.env.example` to `apps/mobile/.env` before starting Metro. Restart Metro after changing the environment. The root `dev:mobile` task builds shared packages first. The regular `pnpm dev` still starts the web and API.

| Variable               | Value                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`  | Required. Base address ending in `/api/v1`, for example `http://10.0.2.2:3001/api/v1` on the Android emulator or the deployed HTTPS API address. |
| `EXPO_PUBLIC_SITE_URL` | Optional public HTTPS website URL for canonical article share links. Without it, shares use the article title and excerpt or author.             |

Expo bundles public environment variables into the app. Keep secrets in the API environment.

Home always shows Live. Set the optional `EXPO_PUBLIC_LIVE_YOUTUBE_ID` to the official 11-character YouTube broadcast ID to show its player. Clear the ID when the broadcast ends. Restart Metro for preview changes and export a new bundle for a release. The API currently has no live-status feed, so the app does not detect when a broadcast starts or ends.

## Connect to the API

- **Physical phone.** Put the phone and computer on the same network and use the computer's LAN IPv4 address, for example `http://192.168.1.10:3001/api/v1`. Allow the API port through the local firewall. A phone's loopback points at the phone.
- **Android emulator.** Use `10.0.2.2` to reach the host on the standard Android Studio emulator.
- **iOS simulator.** Use the macOS host loopback. Local builds require macOS and Xcode.
- **Hosted API.** Use an HTTPS deployment that serves audience, articles, community, and games. Confirm the deployed revision and migrations independently. Where native OS policies block cleartext HTTP, use a trusted HTTPS development endpoint. Expo's Metro tunnel only carries the JavaScript bundle.

For a local database, follow the local PostgreSQL and API setup in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md). Apply pending migrations only to the development database. Start the API with `pnpm --filter @biling/api dev`. The seed includes shows and episodes. Publish approved article and game fixtures locally to exercise those screens. Account registration and email depend on the API capabilities response.

## Android and iOS

With an SDK 58-compatible Expo Go installed, scan the Metro QR code on a physical phone or press **a** or **i** for a running emulator or simulator where supported. Rebuild any local development client created with a previous SDK. [Expo SDK 58 upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)

For a local native build, first run `pnpm --filter @biling/mobile^... build` from the root or start the root mobile task once to build the shared modules. Then run `pnpm --filter @biling/mobile android` with Android Studio and an emulator or device. On macOS, run `pnpm --filter @biling/mobile ios` with Xcode and an iOS simulator. The generated native directories are ignored.

The app embeds the official YouTube IFrame player inside the OS WebView, scoped to the player. It uses the app ID as the HTTPS base origin for referrer identity, keeps an external YouTube action available and waits for a user gesture. Verify playback, fullscreen, network failure and embeds disabled by the video owner on both platforms. [YouTube embedding requirements](https://developers.google.com/youtube/terms/required-minimum-functionality)

## API coverage

All paths below are relative to `/api/v1`.

| Experience                        | API paths                                                                                                                                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery and show archives       | GET `/shows`, `/shows/:slug`, `/episodes`, `/search`                                                                                                                                                                                                                               |
| Episode viewing                   | GET `/shows/:slug/episodes/:episodeSlug`                                                                                                                                                                                                                                           |
| Stories                           | GET `/articles`, `/articles/:slug`                                                                                                                                                                                                                                                 |
| Games and participation           | GET `/games`, `/games/:slug`, `/games/history`; POST `/games/:slug/attempts`                                                                                                                                                                                                       |
| Profile and session               | GET `/audience/capabilities`, `/audience/me`; PATCH `/audience/me`; POST `/audience/login`, `/audience/logout`, `/audience/register`, `/audience/forgot-password`, `/audience/resend-verification`                                                                                 |
| Reactions, follows and discussion | GET `/community/following`, `/community/engagement`, `/community/comments`; POST `/community/comments`, `/community/comments/:id/reports`; PATCH/DELETE `/community/comments/:id`; PUT/DELETE `/community/likes`, `/community/comments/:id/likes`, `/community/shows/:slug/follow` |

The same audience bearer used by the web server is held in SecureStore on mobile. Verification and password reset links use the existing website flow. Official scores and daily eligibility come from NestJS. The following feed builds a recent-episode list from up to eight followed show archives because there is no dedicated feed API.

## Verify locally

Run `pnpm --filter @biling/mobile... build`, `pnpm lint`, `pnpm typecheck` and `pnpm test`. The mobile build exports iOS and Android JavaScript bundles. Open a device build to validate native behavior.

- Navigate from each tab into details and back. Check search and catalog pagination, pull-to-refresh, empty states and disconnect/reconnect behavior.
- Register and sign in, restart the app, edit the profile and sign out. Test an expired session and verify account recovery links.
- Play a published episode, check an unavailable video and open fullscreen. Read and share a story with an image, list, and YouTube block.
- Follow a show, like content, post/edit/delete a comment, reply, and report a test comment. Play each game type and check the second official daily submission, practice and the profile history.
- Check a small phone, large text, screen readers, keyboard overlap, device motion preferences and Arabic article direction.

Explore runs the grouped content search and the paginated game search separately. Game search requires a backend revision that supports `GET /games?q=...`. Personalized recommendations, activity notifications, enforced game timers, French and Arabic interface translations and complete RTL review are future work. No store publishing or cloud build setup is required.
