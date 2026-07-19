# Vitalyst Healthcare Portal

An early multi-clinic electronic health record (EHR) prototype designed for the Jamaican healthcare context. This repository documents the product and technical foundation that preceded **CariCare**, a patient-controlled, agentic health-record platform for the Caribbean.

> **Prototype status:** This is an archived proof of concept reconstructed from the original 2025 Replit project. It is not a certified medical device, is not production-ready, and must not be used with real patient data.

## What the prototype explored

- Multi-clinic patient and staff management
- Role-based access for clerks, nurses, doctors, clinic administrators and platform administrators
- Patient registration, search and duplicate-record detection
- Longitudinal medical records and medical-history capture
- Appointment scheduling
- Patient test-result and document workflows
- Audit logging and clinic-scoped access
- Clinic subscription tiers and billing experiments
- Jamaican parish and address context

## Technology

- React, TypeScript, Vite and Wouter
- Express and Node.js
- PostgreSQL/Neon and Drizzle ORM
- Passport session authentication, with experimental Clerk integration
- TanStack Query, React Hook Form and Zod
- Tailwind CSS, Radix UI and shadcn-style components
- Experimental Stripe billing integration

## Repository structure

```text
client/       React frontend
server/       Express API, authentication, permissions and integrations
shared/       Shared Drizzle schema and TypeScript types
migrations/   Prototype database migrations
scripts/      Development and synthetic-data utilities
docs/         Product history and security notes
```

The generic files under `client/src/components/ui/` are retained because the application imports them directly. They are supporting UI components rather than Vitalyst business logic.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and provide a PostgreSQL `DATABASE_URL` and strong `SESSION_SECRET`.
3. Install dependencies:

   ```bash
   npm ci
   ```

4. Push the Drizzle schema to a disposable development database:

   ```bash
   npm run db:push
   ```

5. Start development mode:

   ```bash
   npm run dev
   ```

Do not use a production database or real medical records.

## Security and privacy

The public reconstruction excludes the original upload directory, temporary files, Replit metadata, cookie files, password-setup utilities and development authentication bypasses. See [SECURITY.md](SECURITY.md).

## Evolution into CariCare

Vitalyst started as a clinic-centred EHR. The later CariCare concept expands the problem from managing records inside one system to making fragmented health information portable, patient-controlled and intelligently processed across providers. See [docs/evolution-to-caricare.md](docs/evolution-to-caricare.md).

## Licence

The recovered project declared the MIT licence in its package metadata. Third-party packages remain subject to their own licences.
