import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
    // Clerk user ID - primary identifier from Clerk
    userId: text('user_id').primaryKey(),
    
    // Basic user information
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: text('name').notNull(),
    profileImageUrl: text('profile_image_url'),
    
    // Optional location
    location: text('location'),
    
    // UI customization preferences
    theme: varchar('theme', { length: 50 }).default('modern'), // e.g., 'modern', 'classic', 'dark', etc.
    customFont: text('custom_font'), // For custom font preferences
    uiPreferences: text('ui_preferences'), // JSON string for additional UI preferences
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type inference for future queries
export type UserInsert = typeof users.$inferInsert; 
export type UserSelect = typeof users.$inferSelect;