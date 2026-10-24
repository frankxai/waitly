cat << 'INNER' > src/app/page.tsx
import { connection } from "next/server";
import { getNotionDatabaseRowCount } from "~/lib/utils";
import { LandingPage } from "./page.client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const databaseId = process.env.NOTION_DB;
  if (!databaseId) {
    throw new Error("NOTION_DB is required to render the waitlist count");
  }

  await connection();
  const waitlistPeople = await getNotionDatabaseRowCount(databaseId);

  return <LandingPage waitlistPeople={waitlistPeople} />;
}
INNER

cat << 'INNER' > src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { notion } from "./notion";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getNotionDatabaseRowCount(databaseId: string) {
  try {
    let rowCount = 0;
    let hasMore = true;
    let startCursor: string | undefined;

    // Fetch all pages from the database (handling pagination)
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
      });

      rowCount += response.results.length;
      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    return rowCount;
  } catch (error) {
    console.error("Error fetching database rows:", error);
    throw error;
  }
}
INNER
