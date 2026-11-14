# Sales dashboard - 2026-11-14

## Metrics
- Admin-only `GET /api/v1/admin/dashboard?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD` aggregates database data without transferring product/user lists to the browser.
- Dates refer to order creation dates, using the application's existing Vietnam-local database calendar convention. Both endpoints are included; the maximum range is 366 days; default is the latest 30 days in Asia/Ho_Chi_Minh.
- Orders created includes canceled orders. Paid order count/value includes only COMPLETED payments attached to non-canceled orders, summed from order totals. Average is paid order value divided by paid order count, or zero for an empty set.
- This is an order-creation cohort report using current payment state, not net revenue or payment-receipt-date reporting. Historical payment completion timestamps are not inferred from updated_at. Later payment/cancellation changes can change historical cohort totals.
- Daily series includes zero-order dates. Switching chart metrics never mixes money and order counts on one axis; an accessible data table is available.
- Current queues are independent of selected dates: fulfillable Processing orders, Shipped orders, Delivered/PENDING COD orders, and REFUND_REQUIRED payments (including payments without orders).
- Inventory alerts count variants at zero and at 1-5 units, alongside total units in stock (sum of variant quantities) and parent products without any variants (counted separately, not treated as zero-stock variants). All inventory figures are current and independent of the date filter. Customer counts exclude ROLE_ADMIN and active customers require ACTIVE. Product count means parent products.
- Loading and failed requests never display fabricated zero statistics. Date changes cancel stale requests. Presets use Vietnam dates; custom ranges require Apply.

## Verification
- H2: 25 backend regression groups passed.
- Isolated MySQL 3308: all 25 groups passed twice, including inclusive date boundaries, cancellation/COD/refund exclusions, paid averages, series/card reconciliation, zero-filled days and independent backlog counts.
- All frontend utility/session tests, targeted ESLint, and production build passed. Existing bundle-size/deprecation warnings remain.
- Headless Chrome passed preset/custom filters, chart metric changes, daily table, error/retry versus valid zero results, read-only requests and widths 390/768/1024/1440.

## Local Deployment
- No schema migration. Packaged backend uses `--spring.jpa.hibernate.ddl-auto=validate`.
- Private backup: `backups/creatshopdb3-20261114-130832-b2051485.sql`.
- SHA256: `b7a83aee38e69e78b3b29002366958478ba13ee98befd886c1696e354fa8c8ee`.
- Live checks cover anonymous 401, customer 403, administrator 200, invalid date 400, and SQL reconciliation. Temporary read-only test tokens are not saved.
- Verified stock, order totals/statuses, payment statuses and table counts remained unchanged. Admin remains ACTIVE.

## Deliberate Limits
- No net-revenue, refund-execution or receipt-date reporting without dedicated payment/refund event data.
- Management links open existing management screens; they do not claim to pre-apply queue filters.
