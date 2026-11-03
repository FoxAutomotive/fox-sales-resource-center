# Initial research status

Research attempted November 3, 2026. No vehicle specifications have been verified.

| Requested guide            | Status                                     | Next step                                                                                                   |
| -------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 2026 Toyota RAV4           | Awaiting official source access and review | Confirm U.S. trim structure, powertrains, per-trim equipment, package availability and conditions           |
| 2026 Volkswagen Tiguan     | Awaiting official source access and review | Confirm U.S. trim/configuration structure, per-trim equipment and package conditions                        |
| 2026 Chevrolet Equinox     | Awaiting official source access and review | Confirm gasoline Equinox trim/drivetrain structure, equipment, and packages; research Equinox EV separately |
| Remaining 2026 U.S. lineup | Not yet researched                         | Enumerate official retail lineups, then add verified model records progressively                            |
| 2027 U.S. lineups          | Not yet researched                         | Confirm each model’s availability and model-year documentation independently                                |

The environment initially allowed package registries and GitHub but not manufacturer sites. Read-only HTTPS requests to `pressroom.toyota.com`, `www.chevrolet.com`, and `media.vw.com` were denied by the network proxy with HTTP 403 at CONNECT. No destination contents were obtained. This is an access limitation, not evidence that manufacturer information is unavailable.

A configuration draft was saved adding the official research domains: `pressroom.toyota.com`, `www.toyota.com`, `www.chevrolet.com`, `media.chevrolet.com`, `news.chevrolet.com`, `media.vw.com`, and `www.vw.com`. Existing preset domains were preserved. Saving the draft alone does not apply the policy or publish anything. The environment tool requires review/save and environment publication to activate the changes. After policy activation, retry actual source reads and investigate redirects/CDN destinations before requesting any further additions.

No dated specification assertions, trim lists, package names, or upgrade recommendations have been entered to work around this blocker. The model-page links are explicitly marked research targets, not reviewed citations. The representative comparisons are exercised with **synthetic test data only**; that data is excluded from the production build.
