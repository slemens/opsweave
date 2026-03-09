-- ═══════════════════════════════════════════════════════
-- OpsWeave — Database Initialization (PostgreSQL)
-- ═══════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Cryptographic functions

-- ─── Helper Function: updated_at Trigger ────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- NOTE: Tables are created via Drizzle ORM migrations.
-- This script only provides PostgreSQL-specific extensions
-- and helper functions that SQLite doesn't need.
--
-- ENUMs are NOT used — all validation happens at the
-- application layer via Zod for SQLite compatibility.
-- ═══════════════════════════════════════════════════════
