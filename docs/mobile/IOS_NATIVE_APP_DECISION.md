# JARVIS iPhone app — implementation decision

## Decision

Deliver an installable iOS application, not a Home Screen website/PWA as the final product.

For the first iPhone release, use **Capacitor around the existing React/Vite application**. This produces a real signed iOS app package that can be installed through TestFlight and later distributed through the App Store, while reusing the existing HUD, React components, state and most of the conversation UI.

This is a native app container with a web-rendered interface, not a claim that the current Vite code is already a fully native Swift/SwiftUI interface. A full React Native or SwiftUI rewrite is not the sensible first move: it would duplicate a substantial interface and increase delivery and maintenance cost before the mobile workflow is validated.

## What must become native

The existing browser voice layer cannot simply be assumed to work identically inside iOS. Add a platform adapter boundary and implement/test iOS-specific capabilities for:

- Microphone permission and audio capture.
- Speech recognition / transcription.
- Text-to-speech and audio session lifecycle.
- Audio interruption and route changes (headphones, Bluetooth, phone calls).
- App foreground/background lifecycle and reconnect behaviour.
- Secure credential/device enrollment and revocation.

The desktop/browser implementation remains intact behind the same adapter interfaces.

## iOS constraints

- Microphone capture must be permissioned and visibly user-initiated.
- Push-to-talk is the baseline interaction. Do not promise an always-listening wake word while the app is backgrounded or the phone is locked.
- Background audio modes are not a loophole for permanent microphone surveillance; only request background capabilities that fit Apple's allowed use and review requirements.
- Notifications and Siri/Shortcuts integrations are later capabilities and require their own native implementation and permissions.

## Connectivity and security

The app must not connect directly to an exposed Windows bridge port. Keep the bridge loopback-only on the PC. Use a separately authenticated, encrypted relay/session between the iPhone app and the Windows host, with short-lived revocable device credentials and an allowlisted set of mobile capabilities.

Never embed Claude, MCP, bridge, or Windows vault secrets in the iOS application bundle. Windows Credential Manager remains on Windows. Shared memory is not enabled until encrypted sync, device identity, recovery, revocation, retention and deletion have been designed and tested.

## Delivery stages

1. Add Capacitor iOS target and app identity; keep Vite browser/desktop build working.
2. Audit and adapt responsive HUD, safe areas, touch targets and navigation.
3. Introduce platform audio interfaces; preserve current desktop voice implementation and add an iOS-native implementation.
4. Build, sign and install on a physical iPhone through Xcode/TestFlight.
5. Implement the authenticated Windows-host relay and mobile capability allowlist.
6. Test audio, interruptions, reconnection, device revocation and memory approvals on a real device.
7. Prepare App Store privacy disclosures and review requirements before public release.

## Acceptance criteria

- A real JARVIS app icon and signed iOS app install, not only an Add-to-Home-Screen website.
- The existing JARVIS identity and HUD are retained.
- Push-to-talk, transcription, spoken replies and interruption work on a physical iPhone.
- The app can securely reach the Windows-hosted session without exposing the local bridge.
- No secrets are shipped in the app bundle.
- The existing Windows experience remains functional.
- Background listening is not advertised unless a separately approved and technically validated iOS design supports it.

## Status

Architecture decision recorded. This commit does not add Capacitor, create an Xcode project, provision relay infrastructure, sign an app, or install anything on the user's phone. Those steps remain implementation work.
