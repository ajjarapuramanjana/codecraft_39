# Project structure

- `app.py` — Flask routes, session authentication, request validation.
- `templates/` — Jinja HTML pages (base layout, landing, auth, dashboard, simulator, analyzer).
- `static/css/styles.css` — responsive visual design and mobile breakpoints.
- `static/js/main.js` — client-side validation, simulator interactions, fetch calls.
- `static/images/` — place images and visual assets here.
- `services/analyzer.py` — optional AI integration and defensive rules fallback.
- `services/scenarios.py` — fictional training scenarios.
- `database/db.py` — SQLite initialization and database connection helper.
- `database/schema.sql` — equivalent reference schema for PostgreSQL/Supabase migration.
- `tests/` — basic automated tests.
- `.env.example` — configuration template.
