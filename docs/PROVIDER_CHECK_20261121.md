# External provider check - 2026-11-21

## Scope and evidence

The ignored `CreaTShop-server/creatshop/config/application.properties` already
contains credentials for Cloudinary, VNPay, Google and Facebook. They are not
included in the handover ZIP. The original Docker test environment deliberately
has blank external-provider variables; this is not evidence of missing local keys.

Checks use only the separate `creatshop-handover-check` database and its existing
volume/password/JWT. No native database or original catalog writes were performed.
Private evidence: `backups/handover-20261121-113842/provider-live-check.json`.
Private runtime configuration is intentionally excluded from Git and packages.

## Results

- Cloudinary: an authenticated test administrator created demo product 13 through
  the actual multipart product API (HTTP 201). Both images were uploaded, stored
  in the demo database and downloaded over HTTPS (HTTP 200). Decoded RGBA pixels
  match the PNG fixture. Encoded file hashes differ after provider processing;
  byte identity is not the acceptance criterion. Only these two new assets and
  the synthetic product are retained for inspection; no old assets were deleted.
- Google: the demo callback on port 19081 produced `redirect_uri_mismatch`.
  Switching the isolated stack to the existing local callback on port 8080
  removes that provider-page error. This does not verify a complete user login
  or the token exchange/client secret. No passwords, consent or CAPTCHA were automated.
- Facebook: authorization redirects to Facebook and the provider page is reachable.
  No listed error marker was observed, but this is not proof of app approval,
  permission availability or a completed login/token exchange.
- VNPay: the application created a real signed sandbox URL for a synthetic order
  of VND 742000. VNPay returned error 71: `The terminal (website) not approved`.
  No payment was completed and no genuine IPN was received. The test order was
  canceled through the application and its reserved variant stock was restored.

## Routing correction and runtime checks

Both Docker Nginx configurations now forward `/oauth2/` and `/login/oauth2/`
to Spring Boot, alongside `/api/`. Previously these paths returned the SPA,
which prevents the relative social-login buttons from starting OAuth.
`/login` remains a frontend route.

Verification: Nginx syntax passes; live requests through the demo frontend return
302 to Google/Facebook with a session cookie and the configured callback. Invalid
callback requests redirect to the frontend login error rather than authenticating.
Provider discovery reports both enabled. All 29 Python tests pass, including the
regression check for both Nginx configurations.

## Current local entrypoints and remaining work

- Original 149-product store: `http://localhost:15173`; its backend/provider
  environment was not recreated or changed by these checks.
- Provider-check synthetic demo: `http://localhost:5173`; backend callback:
  `http://localhost:8080`. These are Docker demo ports, not native app processes.
  Use `localhost`, not `127.0.0.1`, for the configured OAuth origin.
- The compatibility bindings and private credentials live in the ignored local
  overlay, not in the default compose configuration. The earlier `creatshop-handover-20261121.zip`
  predates this routing correction and is not a snapshot of these changes.
- Remaining: complete interactive Google/Facebook login with an authorized user;
  obtain VNPay sandbox terminal approval/valid merchant configuration, then test
  genuine payment, return and IPN on an authorized reachable callback. A local
  loopback URL cannot receive external IPN. No public tunnel was created.
- Do not label the whole provider suite or thesis as fully accepted on this evidence.
