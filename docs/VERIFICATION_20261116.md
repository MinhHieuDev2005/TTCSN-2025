# Verification: 2026-11-16

Scope: secure social linking/profile editing, admin header, compact storefront
footer and prominent out-of-stock labels. Feature PRs target `develop`, not `main`.

## Local checks

| Check | Result |
| --- | --- |
| H2 service regression | 32 groups passed |
| Customer HTTP | 50 assertions passed |
| Chat HTTP/SSE | 67 checks passed |
| Mock OAuth and account linking | 14 groups passed |
| Private MySQL | 32 regression groups and migration checks passed |
| Frontend utility scripts | All 10 suites passed |
| Browser scripts | All 14 suites passed after fixture updates |
| ESLint, changed application JS/JSX | Passed |
| Production frontend build | Passed; existing large-bundle warning remains |
| Built-app preview | Footer, admin header, profile, customer lists and social links passed |

Browser coverage includes admin filters, header, reliability, branding, chat,
contact, customer flows, customer lists, live updates, news, profile, social login,
social linking and footer. Footer checks cover five viewport widths, Vietnamese
and English, link targets, keyboard navigation, compact height and stock-label
contrast. All HTTP/browser fixtures use isolated databases or mocked APIs; no
customer records or local application processes were changed by this verification.

The test fixtures now select dashboard requests rather than unrelated chat polls,
wait for filter responses, tolerate mocked SSE delivery during navigation, and
distinguish header/sidebar unread labels. News checks expect the new charcoal
footer. These changes do not remove business assertions. Admin filters and chat
also passed a second consecutive run after these corrections.

## Reproduction and release limits

- Run `scripts/test-backend.ps1` and `scripts/test-mysql.ps1` for isolated checks.
- Run each `CreaTShop-Client/tests/*.test.mjs` with Node.
- With the local frontend running, run `tests/*.browser.mjs` with Playwright and
  Chrome available. `PLAYWRIGHT_MODULE` can point to an existing installation.
  Run profile, adminHeader and storefrontFooter from `CreaTShop-Client`; the
  remaining browser suites use the repository root for screenshot output.
- Apply the repeatable profile migration on any deployment database before
  `ddl-auto=validate`; see `docs/PROFILE_SECURITY.md`. Do not reapply other
  migrations blindly. The current local profile migration was applied earlier.
- Real Google/Meta consent and production configuration, real VNPay settlement,
  and audible/browser notification permissions still need manual acceptance.
- Before merging each PR, require successful `verify` and `mysql-regression`
  jobs on both push and pull_request. Local browser checks supplement CI;
  the existing GitHub workflow does not execute the browser suites.
