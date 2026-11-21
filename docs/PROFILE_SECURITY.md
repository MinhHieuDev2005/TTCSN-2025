# Profile security

Before starting this version with `ddl-auto=validate`, select the application
database and run `CreaTShop-server/creatshop/database/20261116-profile-security.sql`.
The migration is repeatable and only adds the nullable `users.password_configured`
column. It does not change existing users, password hashes, identities or orders.

New password registrations record `true`; new social registrations record `false`.
Linking an external provider never changes this value. Existing accounts keep
`NULL`: an account without social identities can use its existing password form;
an account with identities gets neutral guidance and can still change a known
local password. We deliberately do not infer signup origin from generated-looking
usernames. A successful password change records `true` and invalidates old JWTs.

Personal edits only change names, phone and the existing optional birth date.
Email is read-only, including at the API boundary. An old client may submit its
unchanged email, but any changed email rejects the complete update transaction.
Email changes and setting/resetting a social-only password remain unavailable
until an ownership-verification and recent-reauthentication flow is implemented.

Checks: `scripts/test-backend.ps1`, `scripts/test-mysql.ps1`,
`node tests/profile.browser.mjs`, `node tests/customer.browser.mjs`,
`node tests/socialLinks.browser.mjs` from the appropriate project directories.
