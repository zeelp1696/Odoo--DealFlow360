# DealFlow360

DealFlow360 is a 24-hour hackathon build for governed B2B deal operations. The source problem statement, finalized PostgreSQL schema, and evaluator roadmap are kept at the repository root.

## Current checkpoint

The first vertical slice is implemented:

- React/Vite login and logout experience
- Express API with PostgreSQL-backed users
- bcrypt password verification and JWT sessions
- role middleware for Admin, Sales Rep, Sales Manager, Finance/Operations, and Customer
- separate role workspaces, including a restricted customer portal
- seeded evaluator accounts in [`db/seed.sql`](db/seed.sql)
- full 24-hour module plan in [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md)

## Local setup

1. Create a PostgreSQL database named `dealflow360`.
2. Apply [`schema.sql`](schema.sql), then [`db/seed.sql`](db/seed.sql).
3. Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL` and `JWT_SECRET`.
4. Start the API:

	```text
	cd backend
	npm install
	npm run dev
	```

5. In another terminal, start the client:

	```text
	cd frontend
	npm install
	npm run dev
	```

Open `http://localhost:5173`. All seeded demo users use `DealFlow360!24` locally:

| Role | Email |
|---|---|
| Admin | admin@dealflow360.local |
| Sales Rep | sales@dealflow360.local |
| Sales Manager | manager@dealflow360.local |
| Finance | finance@dealflow360.local |
| Customer Portal | customer@dealflow360.local |

The next build slice is catalog and customer data, followed by discount governance and the quotation builder. The dependency order and two-hour evaluator checkpoints are documented in [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md).
