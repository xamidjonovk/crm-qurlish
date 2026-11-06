# Qurilish CRM

## Confirmed product truth

Repository-backed web CRM for construction companies selling apartments in Uzbekistan. The interface language is Uzbek. A company owns complexes, apartments, leads, users and audit records; authenticated queries enforce company boundaries.

## People and tasks

- Administrator: manage catalog, users, audit and lead pipeline.
- Seller: read leads, contact customers, schedule viewings and confirm apartment sales.
- Viewer: read leads without write controls.
- Public visitor: browse a company slug, filter apartments and submit a consented contact request.

## 3D residence catalog

The exterior follows the user-selected Regnum Plaza business-class reference: copper portal frames, warm clinker and limestone, recessed glazing and landscaped pergola lounges. A built-in imagegen concept is available in an accessible **Dizayn konsepsiyasi** dialog, explicitly separate from live 3D inventory. It loads only when requested. Building positions and floor counts remain database-driven.

Administrators manage company-owned buildings and apartment placement (floor, facade, slot), area, interior image and floor-plan image URLs. All CRM roles can browse the 3D residence, and public visitors can use the same viewer within the company catalog. A parameter-driven Three.js model provides building/floor/apartment focus, facade navigation and current availability. Selecting a building isolates it from neighboring buildings; selecting a floor exposes its apartment footprints. Selecting an apartment opens a furnished 3D cutaway with camera-facing exterior walls hidden, orbit, overhead and reset controls. Natural stone, wood, glazing and physically based lighting support the hi-tech architectural style. Sale confirmation updates the same inventory used by the viewer; it refreshes every 15 seconds. Exact architectural models are not imported; generated floor plans and matching furnished interiors are explicitly labeled concepts based on room count and area.

## Workflow

New → contacted → viewing → won. New/contacted/viewing can be closed as lost. Sale confirmation is allowed only from viewing. It locks the lead and apartment in one transaction, checks expected lead version and availability, marks both sold/won, and records an audit event. Sold apartments cannot be edited or deleted. Linked catalog records cannot be deleted.

## Platform

Web. Next.js static export served by FastAPI at the same origin; PostgreSQL stores tenant data. Desktop and mobile browsers. Glassmorphic appearance explicitly requested by the user.

## Demo

Synthetic Uzbek fixtures in a separate local database: ozod-demo, three role accounts, three complexes, 36 apartments and 24 initial leads. Browser tests may add synthetic records. The application database is not seeded by the test preparation command.

The additive `app.seed_residence` fixture creates a separate Chinor Park demo with four seven-floor buildings and 168 apartments, including an AI-generated illustrative interior. Existing demo and application inventory is not reassigned.
