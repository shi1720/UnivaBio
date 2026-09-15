import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    patientName: text("patient_name").notNull(),
    documentTitle: text("document_title").notNull(),
    state: text("state").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_episodes_owner_updated").on(table.ownerId, table.updatedAt),
  ],
);
