import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const dbDriver = process.env['DB_DRIVER'] ?? 'sqlite';

const pgConfig = defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://opsweave:opsweave_secret@localhost:5432/opsweave_db',
  },
});

const sqliteConfig = defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'file:./data/opsweave.db',
  },
});

export default dbDriver === 'sqlite' ? sqliteConfig : pgConfig;
