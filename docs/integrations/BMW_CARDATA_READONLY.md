# BMW CarData — read-only personal integration

**Status:** adapter implemented in source; not connected, not enabled, no credentials stored.

## Official capability boundary

BMW CarData exposes customer-authorized telematics data through REST and MQTT streaming. BMW's customer portal says personal use is free. The personal API uses a customer-created client ID and OAuth 2.0 Device Authorization Grant with PKCE. The integration guide documents:
- REST scope: `cardata:api:read`
- Optional streaming scope: `cardata:streaming:read`
- Access token lifetime: 1 hour
- Refresh token lifetime: 14 days
- REST rate limit: 50 requests per UTC day

BMW CarData is a vehicle-data API, not a remote-control API. BMW explicitly states direct access to the vehicle is not possible through CarData. JARVIS must not use it for climate, lock/unlock, windows, trunk or other commands, and must not reverse-engineer ConnectedDrive endpoints.

Personal-use CarData must not be confused with the BMW third-party service-provider platform, which charges for telematics data. This adapter is intended only for the owner's personal customer portal/client.

## Implemented source

`src/lib/integrations/bmw-cardata.ts` currently provides:
- PKCE S256 verifier/challenge generation
- Device-code authorization request
- Device-code token exchange
- Refresh-token exchange
- Read-only vehicle mappings
- Read-only basic vehicle data
- Read-only telematics data for a customer-configured container
- Read-only charging history for a bounded ISO-8601 time window with pagination
- Mandatory injected daily-request-budget interface; fails closed before network access if the budget denies a request

No tokens, VINs or customer data are embedded in source. The client never logs credentials and has no command/mutation methods.

## Production prerequisites — not yet satisfied

Before connecting the vehicle:
1. Owner creates a BMW CarData client ID in the official customer portal.
2. Owner authorizes the device-code flow and explicitly grants only `openid`, `authenticate_user` and `cardata:api:read` initially.
3. Implement a persistent, atomic Supabase budget RPC keyed by JARVIS user + UTC day. It must stop at 50 REST calls/day across all app instances; an in-memory counter is test-only.
4. Implement encrypted server-side refresh-token storage with service-role-only access. Do not store refresh tokens in ordinary plaintext tables, logs, browser storage or source control.
5. Add per-user consent, disconnect/revocation and token deletion flows.
6. Validate the available telematics keys for the actual iX1 in the BMW catalogue; do not assume every vehicle exposes the same data.
7. Keep polling conservative. The API limit is 50/day; no aggressive refresh loops.

The iOS Keychain adapter can later protect tokens on-device, but a cloud-first assistant also needs a secure server-side token vault. That storage layer has not yet been implemented.

## Explicitly out of scope

- Climate preconditioning
- Lock/unlock
- Doors, windows, sunroof or trunk commands
- Charging-setting mutations
- Any unofficial My BMW/ConnectedDrive private endpoint
- MQTT streaming until a long-lived cloud worker and token lifecycle are validated

Remote actions remain unavailable unless BMW publishes a supported official command API for the required operation. My BMW app shortcuts may be considered separately as a user-triggered local handoff, not as a JARVIS cloud API.

## Official references

- [BMW CarData personal customer portal](https://bmw-cardata.bmwgroup.com/customer/public/)
- [BMW CarData API integration guide](https://bmw-cardata.bmwgroup.com/customer/public/api-documentation)
- [BMW CarData API specification](https://bmw-cardata.bmwgroup.com/customer/public/api-specification)
- [BMW Group CarData overview and data-access boundaries](https://www.bmwgroup.com/en/general/regulations/cardata.html)

## Validation

Unit tests use mocked HTTP responses and an in-memory budget only. No BMW account, client ID, VIN, token, vehicle data or network request is used by tests. Production activation is blocked until persistent budget, encrypted token storage and explicit owner authorization exist.
