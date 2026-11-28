# Siddhi Landing Site

A standalone three-page marketing site for Siddhi, built with Next.js App Router, TypeScript and Tailwind CSS v4.

## Requirements

- Node.js 20.9 or newer
- npm

## Local development

From the repository root:

```bash
cd landing
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available routes

- `/` — Siddhi IEP tracking platform
- `/ngo` — Réussir Trust
- `/about` — Team introduction placeholder

## Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create the production build
npm run start     # Serve the production build
npm run typecheck # Run the TypeScript checker
```

## Build and run locally

```bash
cd landing
npm install
npm run build
npm run start
```

## Deploy as a separate Vercel project

1. Import the Siddhi Git repository into Vercel.
2. Set the Vercel project's **Root Directory** to `landing`.
3. Keep the framework preset as Next.js.
4. Use `npm install` as the install command and `npm run build` as the build command.
5. Deploy the project.

The landing site is self-contained. It does not import code from `frontend/` or `backend/`.

## External destinations

The two external destinations are centrally configured in `src/config.ts`:

- Siddhi platform: `https://siddhi.bchbenjamin.in/`
- Réussir Trust: `https://reussirtrust.com/`

## Design system

The supplied Descript reference files are kept in `src/styles/theme.css` and `src/styles/variables.css`. The site uses Fraunces for headings, Space Mono for eyebrow labels and Source Sans 3 for body and interface text.

## Scope

All site files and configuration are contained in this `landing/` directory. The rest of the repository is not required to build or deploy this project.
