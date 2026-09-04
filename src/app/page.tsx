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
