# College Events Website Setup Guide

## Quick Start

Follow these steps to set up the College Events platform:

1. **Set up PostgreSQL database:**
   - Create a database named `college_events`
   - Run the schema files:
   ```bash
   psql -U postgres -d college_events -f college_event_schema.sql
   psql -U postgres -d college_events -f college_event_triggers.sql
   ```

2. **Configure backend environment:**
   ```bash
   cd college_event_website_frontend/server
   cp .env.example .env
   # Edit .env to match your PostgreSQL credentials
   ```

3. **Install dependencies:**
   ```bash
   cd college_event_website_frontend
   npm install
   cd server
   npm install
   ```

4. **Run the application:**
   ```bash
   cd ..  # Back to college_event_website_frontend
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Initial Data Setup

Before using the application, you'll need to add at least one university:

```sql
INSERT INTO universities (name, location, description, email_domain)
VALUES ('University of Central Florida', 'Orlando, FL', 'UCF - a metropolitan research university', 'ucf.edu');
```

You can then register a super_admin account to manage the platform, then add more universities through the admin interface.

## Development Workflow

- Backend code is in the `server` directory
- Frontend React components are in `src/components` and `src/pages`
- Database schema is defined in `college_event_schema.sql`
- Database triggers are defined in `college_event_triggers.sql`

## Troubleshooting

- **Database Connection Issues:** Verify PostgreSQL is running and your connection string in `.env` is correct
- **Port Conflicts:** If ports 3000 or 5000 are in use, you can modify them in package.json and .env respectively