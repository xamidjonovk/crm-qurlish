# Qurilish CRM

## Confirmed product truth

Repository-backed web CRM for construction companies selling apartments in Uzbekistan. The interface language is Uzbek. A company owns complexes, apartments, leads, users and audit records; authenticated queries enforce company boundaries.

## People and tasks

- Administrator: manage catalog, users, audit and lead pipeline.
- Seller: read leads, contact customers, schedule viewings and confirm apartment sales.
- Viewer: read leads without write controls.
- Public visitor: browse a company slug, filter apartments and submit a consented contact request.

## Workflow

New → contacted → viewing → won. New/contacted/viewing can be closed as lost. Sale confirmation is allowed only from viewing. It locks the lead and apartment in one transaction, checks expected lead version and availability, marks both sold/won, and records an audit event. Sold apartments cannot be edited or deleted. Linked catalog records cannot be deleted.

## Platform

Web. Next.js static export served by FastAPI at the same origin; PostgreSQL stores tenant data. Desktop and mobile browsers. Glassmorphic appearance explicitly requested by the user.

## Demo

Synthetic Uzbek fixtures in a separate local database: ozod-demo, three role accounts, three complexes, 36 apartments and 24 initial leads. Browser tests may add synthetic records. The application database is not seeded by the test preparation command.
