# BMW CarData — read-only personal integration

**Status:** read-only adapter and Vault token-storage source implemented; not deployed, not connected, no credentials stored.

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
- Server-side budget adapter using JARVIS's existing atomic `jarvis_consume_rate_limit` RPC, capped at 50 requests per rolling 24-hour window

No tokens, VINs or customer data are embedded in source. The client never logs credentials and has no command/mutation methods.

## Production prerequisites — not yet satisfied

Before connecting the vehicle:
1. Owner creates a BMW CarData client ID in the official customer portal.
2. Owner authorizes the device-code flow and explicitly grants only `openid`, `authenticate_user` and `cardata:api:read` initially.
3. Wire `bmw-cardata-budget.ts` into the authenticated BMW API route. It adapts the existing atomic per-user `jarvis_consume_rate_limit` RPC to a strict 50-request rolling 24-hour window. No BMW API route instantiates it yet.
4. Review and apply the Vault token migration only after CI/review; the migration and service-role helper are in source but not deployed. Do not store refresh tokens in ordinary plaintext tables, logs, browser storage or source control.
5. Add authenticated OAuth device-consent, disconnect/revocation and token deletion routes. The server-side Vault helper is ready but no user route or token exists.
6. Validate the available telematics keys for the actual iX1 in the BMW catalogue; do not assume every vehicle exposes the same data.
7. Keep polling conservative. The API limit is 50/day; no aggressive refresh loops.

The migration `20261113220000_jarvis_bmw_cardata_vault.sql` and server helper `bmw-cardata-token-store.ts` now provide a Vault-backed refresh-token store in source. The application table stores only the Vault secret UUID, public client ID and expiry metadata; the encrypted token is held in `vault.secrets` and decrypted only by a service-role RPC. The migration is not deployed to production. The iOS Keychain adapter can later protect tokens on-device as an optional local cache.

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

Unit tests use mocked HTTP responses and fake budget/RPC clients; the SQL test uses only a synthetic refresh token in the isolated CI Vault. No BMW account, real client ID, VIN, token, vehicle data or external network request is used by tests. Production activation is blocked until persistent daily budget, migration review/deployment, authenticated consent routes and explicit owner authorization exist.
