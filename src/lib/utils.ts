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
