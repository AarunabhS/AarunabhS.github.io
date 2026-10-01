# Arunabho Som — master portfolio

A complete static portfolio combining the project collection and hands-on outputs with detailed case studies, a dedicated interactive lab, and a professional résumé. Nine projects; 30 project-gallery images plus six additional case-study evidence charts. No build step, backend or credentials are required.

```sh
python3 -m http.server 4310 --bind 127.0.0.1
```

Open [the local master portfolio](http://127.0.0.1:4310). These files can be served directly by GitHub Pages. This is a local prototype; no deployment has been performed.

## The experience

- **Homepage:** an animated signal sculpture, scroll-linked project showcase, filterable collection, nine hands-on previews, highlighted career/education section, repository activity and contact.
- **Case studies:** `case-study.html?project=watch` (or any project ID) connects the question, approach, design decisions, evidence, results and limitations. Full-resolution image galleries support keyboard controls and Escape.
- **Interactive lab:** `lab.html?project=fraud` links directly to a rendered experiment. All nine projects are connected back to case studies and public source where available.
- **Résumé:** `resume.html` presents the professional record and prints as two A4 pages. `output/pdf/Arunabho-Kanti-Som-Resume.pdf` is a ready-to-download version with selectable text. Career dates use the current portfolio timeline, confirmed by the owner; education and credentials come from the supplied résumé records.
- **Motion:** magnetic buttons, image hover responses, section reveals, sticky layered project transitions, pointer-responsive canvas, scroll-linked shape changes, and page fades. Automatic motion can be paused; operating-system reduced-motion preferences are respected. Canvas rendering is capped near 30fps and stops offscreen or when the page is hidden. Phone layouts use individual project previews.

## What the lab computes

- **Fraud and churn:** frozen validation-derived review policies applied to published phase-two test partitions. Controls show captured positives, false flags, missed positives and actual workload. These are recorded benchmark results.
- **Sentiment:** class-level diagnostics and six real saved sentence scores from the reviewed model. The sarcasm example makes an error visible. The text inputs and scores stay paired; visitors are not shown fabricated inference.
- **Click propensity:** recorded ranking gains, observed click-label capture and enrichment as selection size changes. Negative sampling means the scores do not estimate population CTR or campaign revenue lift.
- **Agoda:** browser aggregation of 1,000 deterministic synthetic bookings, seed 42. The absent original workbook is never represented as business evidence.
- **Talent Radar:** the original 60 fictional-job fixtures; filtering demonstrates the product without production backend access.
- **PlayerPulse:** five-player club-league records at the same age. Missing coverage stays unavailable. The private source has no publicly verified live deployment.
- **Watch Atlas and Country Memory Map:** public applications load in an iframe only when requested, with full-screen links. Watch Atlas uses the archival 2023–2024 collection.

The original detailed prototype's edited-scenario model inference requires its local API. This portable version uses transparent benchmark explorers and saved outputs; it does not contact that API.

## Source records

`data/projects.json` records source revisions, capture dates, preview/full-size images and limits. `data/case-studies.json` carries narratives and contextual metrics. Sentiment and click-ranking exports preserve their model/source hashes. Screenshots and benchmark data remain tied to the reviewed revision.

The activity feed reads eight public repositories anonymously through GitHub's REST API on page load and every ten minutes while visible. Timeouts, session caching and failure messages retain reviewed or last-known versions. The private repository is never queried. A newer commit is marked separately from the static evidence.

## Verification

```sh
node --check portfolio.js
node --check model-lab.js
node --check motion.js
node --check case-study.js
node --check resume.js
node scripts/verify-portfolio.mjs http://127.0.0.1:4310
git diff --check
```

The static browser check covers all nine galleries, filters, recorded numerical outputs, lab deep links, case-study navigation, keyboard/dialog/menu interactions, public-app load-on-request behavior, GitHub failure fallback and desktop/tablet/390px/320px layouts. It avoids requiring external public apps or a live model server. Separate case-study QA inspected all galleries and lightbox controls. The résumé's rendered print output was verified as two clean A4 pages.

## Updating evidence

Existing scripts in `scripts/` export benchmark aggregates, synthetic booking rows, recorded player summaries, screenshots and optimized WebP previews. They write to the portfolio or temporary preview directories without training models, editing source repositories or contacting production services. Update the reviewed data and corresponding case study together when the source changes. After editing résumé content, regenerate and visually verify its PDF before replacing the downloadable version.
