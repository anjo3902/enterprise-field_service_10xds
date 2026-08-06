# Enterprise Facility Management Platform - Backend

This directory contains the backend implementation for the Enterprise Facility Management Platform.

## Project Structure

- `supabase/`: Contains all Supabase configurations, functions, and database schemas.
  - `config.toml`: Project configuration for Supabase CLI.
  - `migrations/`: SQL migrations for creating the database schema.
  - `seed/`: SQL scripts for seed data.
  - `functions/`: Deno Edge Functions and shared utilities.
    - `_shared/`: Reusable helper modules across Edge Functions.
- `.env.example`: Example environment variables file.

## Development Workflow

1. Ensure Docker is running.
2. Ensure you have the Supabase CLI installed.
3. Start the local Supabase environment: `supabase start`
4. Push migrations to the local database: `supabase db push`
5. Serve Edge Functions locally: `supabase functions serve`

## How to Deploy

1. Link your project to your Supabase cloud project: `supabase link --project-ref <project-id>`
2. Push database migrations: `supabase db push`
3. Deploy Edge Functions: `supabase functions deploy`
4. Set secrets on your project using the Supabase dashboard or CLI: `supabase secrets set --env-file .env.production`

## Edge Functions Organization

Edge Functions are organized by domain logic and API usage.
Shared logic such as database connections, external API clients (OpenRouter, Groq, Google Maps), error handling, and authorization logic are encapsulated inside `functions/_shared/` to maintain DRY principles across the platform.
