# College Events Website

A full-stack web application for managing college events, built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Features

- Authentication system with support for students and super_admin roles
- User registration with university email domain validation
- Login/logout functionality with session management
- Responsive UI built with Bootstrap
- Secure backend API with PostgreSQL database integration

## Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL database

## Setup Instructions

### 1. Set up the database

First, create a PostgreSQL database named `college_events`. Then run the provided SQL schema:

```bash
psql -U postgres -d college_events -f /path/to/college_event_schema.sql
psql -U postgres -d college_events -f /path/to/college_event_triggers.sql
```

### 2. Configure environment variables

In the server directory, copy the example environment file:

```bash
cd server
cp .env.example .env
```

Edit `.env` to match your PostgreSQL configuration and set a proper JWT secret.

### 3. Install dependencies

Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### 4. Run the application

Start both the frontend and backend with a single command:

```bash
npm run dev
```

This will start:
- React frontend at http://localhost:3000
- Express backend at http://localhost:5000

## Project Structure

- `/src` - React frontend code
  - `/components` - Reusable UI components
  - `/pages` - Main application pages
  - `/context` - React context for state management
  - `/services` - API services and utility functions
  - `/types` - TypeScript type definitions
- `/server` - Node.js/Express backend
  - `server.js` - Express application setup
  - `db.js` - PostgreSQL database connection

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- `universities` - Information about universities
- `users` - User accounts with authentication details
- `rso` - Registered Student Organizations
- `events` - Events organized by users, RSOs, or universities
- `locations` - Event venues and locations

Refer to `college_event_schema.sql` for the complete database schema.

## User Types

- **Student** - Can browse events, join RSOs, and create RSOs
- **Super Admin** - Can manage the entire platform, approve events

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the frontend app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm run server`

Runs the backend server in development mode at [http://localhost:5000](http://localhost:5000)

### `npm run dev`

Runs both the frontend and backend concurrently

### `npm run build`

Builds the app for production to the `build` folder