# Asyv Code Hub

Asyv Code Hub is a Next.js App Router portal for Asyv School students to
publish projects, explore classmates' work, preview HTML/CSS/JavaScript
submissions, and like projects.

## Features

- Next.js 16, React 19, and strict TypeScript
- Tailwind CSS v4
- React Bits Dock navigation with a single theme/Settings divider and profile reminder badge
- Particle Text brand and Warp Text home headline
- Slide Commit sign-in and sign-up controls
- MongoDB-backed accounts, projects, and likes
- Project posts as an external URL or HTML, CSS, and JavaScript files
- Isolated iframe previews for submitted code
- Login and account registration
- Light/dark theme toggle in the Dock

## Run locally

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and set values for your environment:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/asyv-code-hub
   SESSION_SECRET=replace-with-a-random-secret-at-least-16-characters-long
   ```

   MongoDB must be running and reachable at `MONGODB_URI`. Use a unique,
   private `SESSION_SECRET` with at least 16 characters.

3. Start the development server:

   ```sh
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm build
```

## Main routes

- `/` — project hub landing page and recent submissions
- `/projects` — community project feed
- `/submit` — post a link or upload/edit HTML, CSS, and JavaScript files
- `/login` — sign in or create an account
- `/settings` — profile settings and photo reminder
- `/about` — information about the portal

## API routes

- `GET /api/projects` — list projects
- `POST /api/projects` — publish a project (requires sign-in)
- `POST /api/projects/:id/like` — toggle a like (requires sign-in)
- `GET /api/projects/:id/preview` — render an HTML/CSS/JavaScript project
- `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, and
  `/api/auth/me` — account/session operations

Project previews are embedded in sandboxed iframes; submitted scripts do not
receive same-origin access to the portal.

## Configuration

Update the production URL in `lib/metadata.ts` before deployment. Project
creation is limited by the validation rules in `lib/limits.ts`.
