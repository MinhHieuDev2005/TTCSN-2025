# Variant constraints in natural-language search

The existing hybrid search now extracts a single color, size and requested stock
quantity, alongside the existing price and audience filters. No external LLM or
new dependency is needed. This is deterministic intent parsing, not model training.

Examples (Vietnamese accents and letter case are supported):

- `giay nu mau den size 38 can mua 3 doi duoi 700 nghin`
- `ao mau xanh duong kich co XL 2 cai`
- `shoes color black size 38 3 pairs`

Use `mau`, `color` or `colour` before the color; use `size` or `kich co` before
the size. Quantity requires a unit: doi/cai/chiec/bo/san pham/pair(s)/item(s).
Supported Vietnamese color aliases map to English catalog values, including
den/black, trang/white, do/red, xanh duong/blue, xanh la/green, vang/yellow,
hong/pink, tim/purple, nau/brown, xam/ghi/gray, be/beige and cam/orange.
Other explicit color names use normalized exact matching, not fuzzy guessing.

All constraints must match ONE variant. Stock is not summed across colors/sizes.
Quantity must be 1..1000000; invalid quantities return HTTP 400. Explicit API
color/size filters override inferred ones, consistent with price filter precedence.
The response reports color, size and minQuantity in appliedFilters; the shop shows
these conditions. No qualifying variant means no results, without relaxing filters.
Prices remain per-product prices, not the total cost of the requested quantity.

Scope: one positive color and size only; alternatives, ranges and complex negations
are not implemented. Direct negated color/size requests are rejected rather than
being interpreted as positive constraints. Bare color words without a color marker
still participate in semantic ranking but are not guaranteed hard constraints.
Stock is checked again at checkout; search does not reserve inventory.

Regression check: `./scripts/test-backend.ps1` (includes isolated DiscoveryChecks).
