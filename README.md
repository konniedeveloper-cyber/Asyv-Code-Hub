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
- Project posts as an external URL or up to 20 HTML, CSS, and JavaScript files
- Optional compressed project cover images
- Admin approval queue; students can track pending and rejected submissions
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
- `/my-projects` — see review status, preview, or delete your projects
- `/admin` — approve/reject projects and manage student accounts (admin only)
- `/login` — sign in or create an account
- `/settings` — profile settings and photo reminder
- `/about` — information about the portal

## API routes

- `GET /api/projects` — list projects
- `POST /api/projects` — submit a project for admin approval (requires sign-in)
- `GET /api/projects/mine` — list the signed-in student's projects
- `DELETE /api/projects/:id` — delete your project (admins can delete any project)
- `GET /api/admin/projects` — list projects for moderation (admin only)
- `PATCH /api/admin/projects/:id` — approve/reject a pending project (admin only)
- `GET /api/admin/users` — list student accounts (admin only)
- `DELETE /api/admin/users/:id` — delete a student account and their projects (admin only)
- `POST /api/projects/:id/like` — toggle a like (requires sign-in)
- `GET /api/projects/:id/preview` — render the project entry page
- `GET /api/projects/:id/preview/:file` — serve linked project pages/assets
- `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, and
  `/api/auth/me` — account/session operations

Project previews are embedded in sandboxed iframes; submitted scripts do not
receive same-origin access to the portal.

## Roles and project approval

New accounts always receive the `student` role; the registration form does not
allow role selection. To promote a trusted account to admin, update that user's
document directly in MongoDB:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });
```

New project submissions stay pending until an admin approves them. Only
approved projects appear in the community feed; students can see pending or
rejected projects and optional review notes under **My projects**. Admins can
delete student accounts and projects, but cannot delete admin accounts from
the dashboard.

## Configuration

Update the production URL in `lib/metadata.ts` before deployment. Project
creation is limited by the validation rules in `lib/limits.ts`.
