# Nilatext School Portal — Vite + React + Supabase

A working school-management application based on the supplied Nilatext / Soma Ushinde concept, with a shadcn/ui interface styled with Tailwind CSS. The original HTML demo is kept separately in `../school-management`.

## Run

Requirements: Node.js 22.12 or later and npm.

```bash
npm ci
npm run dev
```

Open **http://localhost:5173**. Keep the terminal open. Stop with Ctrl+C.

The supplied `.env.local` connects to the selected existing Supabase project: `otbigsimwwlnuwkigehv` (“vopondo51@gmail.com's Project”). It contains only the public project URL and publishable browser key. There is no service-role key or database password in this app. Do not put private keys in variables beginning with `VITE_`.

Double-click `start-windows.bat` on Windows after installing Node.js, or run the commands above from this directory. On Linux/macOS use `sh start.sh`.

## First use

1. Choose **New here? Create an account** on the sign-in page.
2. Register with your email and a password. Confirm your email through Supabase's email, then return to the portal and sign in.
3. Choose **Create a school**, enter your name and your school name. This creates your private school workspace and administrator membership. No default password is provided.
4. Create classes, then add learners. Terms 1, 2 and 3 are created for the current year.
5. Approve teacher, parent or student emails in **People & access**. Share the portal URL with them yourself. Approving access does not send an email.
6. The approved person registers with that exact email, confirms it, signs in, and chooses **Join my school**.
7. When a teacher has joined, edit their class and assign them as its teacher. Teachers see learners only in classes assigned to them.

For another person on another device to access the portal, host the Vite production build at an HTTPS address. `localhost` refers to each person's own device and is not a shared URL. No public deployment has been made by this task.

## Email confirmation and recovery setup

In the selected Supabase project's **Authentication → URL Configuration**:

- For local testing, set the Site URL to `http://localhost:5173` and add `http://localhost:5173/**` to allowed redirect URLs.
- Before deployment, replace the Site URL with your HTTPS portal URL and allow that URL's auth redirects.
- Configure production SMTP before inviting a school population; Supabase's default email service is intended for limited testing and may restrict recipient addresses and delivery rates.

Email confirmation and password-recovery links rely on this configuration. The app supports password sign-in, email-confirmed registration, session persistence, sign-out, password reset requests, and recovery-password updates. No account has been registered on your behalf.

## Included workflows

| Role | Access |
| --- | --- |
| Administrator | School overview, learner admission/edit/inactivation, classes and teacher assignment, marks and printed reports, attendance, term invoices and receipt ledger, CSV exports, email-bound access approvals, learner links, member revocation, school identity and terms |
| Teacher | Assigned learners/classes, subject marks, printed reports, attendance, shared staff notes |
| Parent / Guardian | Linked learners' progress, reports, attendance and invoices/receipts |
| Student | Linked learner progress, reports, attendance and invoices/receipts |

Parents can be linked to additional learners under **People & access**. Each account belongs to one school in this version. Administrator creation is limited to creating a brand-new school; joining an existing school never allows self-selection of a role.

The existing academic report cards use five learning areas. Averages use recorded marks, including zero. Missing results display “Not assessed”; partial reports show the number of assessed subjects. Progress bands and generated comments are illustrative and not an official curriculum grading scale.

Attendance starts unmarked. Saving writes only chosen statuses. Fee receipts record payments already received; no money transfer, M-Pesa integration, or online charging is included. Invoices are posted once per learner per term and are immutable; receipts are append-only. An accounting reversal/correction workflow is not included in this version.

## Curriculum, timetables and assignments

- Under **Curriculum**, create departments and subjects, then add each subject to a class for the selected term. Choose a subject teacher and either **Whole class** or **Elective**. Open the elective roster to enrol learners. The class teacher appointment is managed separately under **Classes**.
- Under **Timetable**, add weekly lesson times and rooms for each class subject. The schedule checks for overlaps by class, teacher and room in the same term.
- Teachers use **My teaching** to open their class and subject rosters. Whole-class subjects include all active learners in the class. Electives include active learners explicitly enrolled in that subject.
- **Lesson attendance** opens the roster for a lesson on the selected date. **Attendance** continues to provide the daily class register.
- Under **Assignments**, teachers publish work with instructions and a due date, then view learner responses. Students submit a text response, and families see assignments and responses for their linked learners. Dates indicate when work is due and late work can still be submitted.

The curriculum drives subject rosters, timetables, lesson attendance and assignments. The existing report cards still use the original learning areas.

## Dashboard design

The platform uses square corners throughout, including navigation, cards, dialogs, avatars, form controls and buttons. It uses a light neutral sidebar, white surfaces, subtle pastel summary cards, thin borders, a system sans-serif typeface and restrained blue-and-gold accents. There are no decorative shadows, gradients or curved navigation cutouts. The administrator dashboard has six compact primary shortcuts; less frequent actions remain available in their respective pages. Teacher and student dashboards retain only their permitted actions.

The calendar opens the selected date’s attendance register. Staff notices remain visible only to teachers and administrators. Pending access counts email approvals awaiting acceptance, not pending student admissions. Transport, boarding, discounts, income/expense accounting and staff leave have not been introduced as nonfunctional buttons. Teacher and student profile images shown in the conversation remain visual concepts rather than implemented profile pages.

## Database and security

The base schema, access hardening and academic migration have been applied to the selected Supabase project. **Do not re-run them there.**

For a different fresh project:

1. Apply `supabase/schema.sql`, `supabase/access-hardening.sql`, `supabase/academics.sql`, then `supabase/academics-indexes.sql` using the Supabase SQL editor or your migration tooling.
2. Copy `.env.example` to `.env.local` and enter the new project's URL and publishable key.
3. Configure email URLs as above and restart Vite.

All application tables have row-level security enabled. Tenant and role checks execute in PostgreSQL, rather than relying on hidden navigation. Profiles and roles cannot be changed by client accounts. Foreign keys enforce same-school relationships. Parent/student learner links require administrator approval. Revocation removes membership so existing JWTs no longer authorize school access on subsequent database requests.

The app imports Supabase's official, pinned Auth and PostgREST modules. It has no server-side secret. Private authorization functions derive caller identity from `auth.uid()`, use a fixed empty search path, have restricted execution grants, and are not exposed as REST functions. Small security-invoker RPC wrappers handle school creation, invitation acceptance and access revocation.

Payments lock the invoice while checking the remaining balance. A unique request ID prevents duplicate inserts from repeated submission. Payment references must be unique within a school. No delete or edit grants exist for posted invoices or receipts.

Data is queried from Supabase, with deterministic pagination and visible network/error states. The browser persists the authentication session. School data is not stored in the old demo's localStorage or imported automatically.

## Verify and build

```bash
npm test
npm run build
npm run preview
```

`dist/` is the production build. Deploy that directory to a static host, with SPA fallback to `index.html`. Vite's preview server is for checking a build, not for production hosting.

Tests:

- `tests/domain.test.js`: partial/zero-mark averages, fee balances, payment validation, CSV escaping and navigation.
- `tests/ui.test.js`: React DOM workflow tests using a mock Supabase transport: admission, search, report preview/printing action, marks, attendance, receipts, access approval/cancellation, sign-out, teacher/parent controls, dashboard shortcuts and calendar-to-attendance navigation. These do not send email or contact live Auth.
- `tests/database.sql`: real PostgreSQL/RLS integration checks with transactional fixture accounts. Confirms bootstrap, invitation acceptance, class assignment, marks/upsert, attendance, parent/student scoping, fee visibility, overpayment rejection, tenant isolation, escalation denial, revocation and anonymous denial. It ends with `ROLLBACK` and leaves no fixture accounts or school records.

The production build, domain tests, DOM workflow tests and live database integration checks passed during development. Supabase advisors were checked; missing composite foreign-key indexes for the new tables were added. The project also contains pre-existing `customize` objects and an `rls_auto_enable` function, which this app does not change.

This execution session blocks listening on local ports (`EPERM`), so a real browser-to-localhost check could not be completed here. Live email delivery and browser sign-in against Supabase remain to be checked with your account after URL/SMTP configuration. The tests do not claim those paths were exercised.

## Source layout

- `src/App.jsx`: authenticated shell and school workflows.
- `src/components/Auth.jsx`: registration, sign-in, recovery and onboarding.
- `src/components/UI.jsx`: reusable UI components and accessible modal dialogs.
- `src/components/Dashboard.jsx`: role-aware shortcuts, live summary cards, interactive calendar and staff notice board.
- `src/lib/supabase.js`: official Supabase Auth/Data API module integration.
- `src/lib/api.js`: paginated reads and checked writes.
- `src/lib/domain.js`: calculations, CSV exports and role navigation.
- `src/components/ui/`: shadcn/ui components adapted for the portal.
- `src/styles.css`: Tailwind entry point, theme tokens and report print styles.
- `supabase/`: schema and access-management SQL.
- `tests/`: domain, DOM and live database tests.
