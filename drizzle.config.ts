import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
    schema: './app/db/schema.ts',  // Changed from './src/db/schema.ts'
    out: './migrations', 
    dialect: 'postgresql', 
    dbCredentials: {
        url: process.env.DATABASE_URL!, 
    }
})