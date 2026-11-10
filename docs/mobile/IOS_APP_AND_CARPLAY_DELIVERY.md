# JARVIS iPhone and BMW CarPlay delivery plan

## Product requirement

The iPhone deliverable is a standalone, installable iOS application with a JARVIS home-screen icon, native app lifecycle, secure device credentials, and direct cloud connectivity. A Safari bookmark, PWA, or page that the user must open in a browser is not the final product.

The CarPlay experience is a separate, minimal native companion interface. It is not the full holographic iPhone HUD mirrored onto the vehicle display.

## iPhone app architecture

- Container: Capacitor 8 around the existing React 19/Vite HUD, rendered in WKWebView.
- Backend: direct HTTPS/WSS to the Supabase cloud API. No Windows host, bridge, local tunnel, or browser-exposed model key.
- Identity: Supabase Auth with short-lived access credentials; native secure storage through iOS Keychain. Add device registration/revocation before production.
- Voice: push-to-talk first, native iOS audio capture and playback adapters, explicit microphone permission and capture indicator. Support interruptions, route changes, Bluetooth/headset routes, background/foreground transitions, and network recovery.
- App shell: app icon, splash screen, safe-area handling, status-bar styling, deep links, app version/build metadata, offline/auth-expired/service-unavailable states.
- Wake word: do not promise continuous listening while locked or backgrounded. The initial reliable interaction is user-initiated push-to-talk.
- Privacy: no provider, Claude, MCP, bridge, or Windows vault secrets in the IPA or web bundle.

Capacitor 8's official setup currently specifies Node.js 22+ and macOS with Xcode 26+ for iOS development. See the [Capacitor 8 environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup) and [iOS setup](https://capacitorjs.com/docs/ios). The native iOS project must be generated, opened, built, and signed in an Apple-compatible macOS/Xcode environment. The repository currently has no Capacitor packages/configuration or iOS project.

## BMW CarPlay experience

The intended CarPlay interaction is a safe, glanceable voice assistant:
- A simple JARVIS entry point and a small number of approved template screens.
- Voice-led requests and spoken responses, with large touch targets and minimal text.
- Navigation hand-off to Apple Maps or Waze using supported URL/deep-link flows.
- No full-screen holographic animation, free-form web HUD, keyboard-heavy interaction, or distracting visual conversation while driving.
- BMW climate and other vehicle actions are JARVIS integrations invoked through the assistant, not separate apps and not CarPlay APIs. CarPlay is only an optional, restricted interface to JARVIS; it is not the integration mechanism for My BMW. The BMW action route must be validated independently before promising remote climatization.

Apple's CarPlay framework is limited to supported app categories and approved templates/entitlements. See [Apple's CarPlay developer overview](https://developer.apple.com/documentation/CarPlay) and [CarPlay developer programme](https://developer.apple.com/carplay/). Apple's current developer overview lists categories including audio, communication, navigation, parking, EV charging, food ordering, fueling, public safety, quick food ordering, voice-based conversational, and driving-task apps. This does not guarantee that a general-purpose assistant will be approved. The team must request the relevant CarPlay entitlement and confirm Apple's decision before promising CarPlay distribution.

## Delivery phases

1. **Cloud core gate:** one authenticated, synthetic end-to-end chat succeeds using a server-side provider; user data isolation and rate limits are verified.
2. **Capacitor foundation:** add Capacitor 8 core/CLI/iOS, config, generated native iOS project, app identifiers, icons/splash, build/sync scripts and a macOS simulator build.
3. **Native iPhone adapters:** Keychain, push-to-talk audio capture/playback, audio session handling, lifecycle/reconnect, deep links, safe areas, permissions and privacy manifest.
4. **Physical-device validation:** install on an iPhone, test login/logout, token expiry/revocation, voice, Bluetooth, interruptions, background/foreground, poor network and Windows-off operation.
5. **CarPlay entitlement and companion:** create a native CarPlay scene/template flow only after Apple confirms eligibility; test with CarPlay simulator and the BMW iX1.
6. **Release:** signing, TestFlight, privacy disclosures, App Store review and staged rollout.

## Current status and limitations

- Cloud API and cloud client adapters exist; authenticated live inference is not yet verified.
- The web HUD is cloud-default but is not itself the final iPhone deliverable.
- No Capacitor dependency, Capacitor config, native iOS project, Keychain adapter, native voice adapter, signed IPA, or TestFlight build exists yet.
- No CarPlay entitlement has been requested or granted, and no CarPlay implementation exists.
- The current development environment can edit repository files through GitHub but does not provide macOS/Xcode. Do not claim an iOS project was built or a native app tested until a macOS/Xcode build and physical-device test are recorded.
- Do not provision paid macOS build services or incur paid infrastructure without explicit approval.
