# Landing concept

Reference: https://mbc.uz/ for premium residential developer site structure and tone. Original built-in imagegen asset: `frontend/public/assets/residence/landing-hero.webp`. The architectural render and Chinor Park inventory are explicitly identified as illustrative examples; actual pricing and availability must be confirmed with the company.

Prompt:

> Use case: photorealistic-natural. Asset type: premium residential developer website hero, landscape. A wide cinematic architectural photograph at blue hour of an original modern business-class residential complex in Tashkent, copper vertical frames, warm limestone and clinker, tall recessed glazing, mature trees and landscaped courtyard, elegant warm interior lights, natural photographic realism, restrained dark olive and bronze palette. Framing: architecture on right and lower half, softly dark foliage and sky on left with generous quiet space for overlaid text. No text, logo, watermark, people, or cartoon.

`/api/v1/site` resolves `LANDING_COMPANY_SLUG` when configured or the sole existing company. It returns 503 if the choice is ambiguous; it never silently selects an arbitrary tenant. The production company is currently `sinov-qurilish`. Demo runner configures `ozod-demo` for its isolated database. Dashboard aggregates are scoped to the authenticated company, and customer inquiries enter the existing lead workflow.
