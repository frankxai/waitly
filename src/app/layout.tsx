import type { Metadata } from "next";
import { Geist_Mono, Inter_Tight } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import Header from "~/components/header";
import { ThemeProvider } from "~/providers/theme-provider";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const interTight = Inter_Tight({
	variable: "--font-inter-tight",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://waitly.idee8.agency"),
	title: "Idee8 — Next.js + Notion Waitlist Template",
	description:
		"A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel.",
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Idee8 — Next.js + Notion Waitlist Template",
		description:
			"A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel.",
		url: "https://waitly.idee8.agency",
		siteName: "Waitly",
		type: "website",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			<body
				className={`${interTight.variable} ${geistMono.variable} antialiased flex flex-col h-full`}
			>
				<ThemeProvider>
					<Header />
					<Toaster />
					{children}
				</ThemeProvider>
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs to be injected directly
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@graph": [
								{
									"@type": "WebSite",
									"@id": "https://waitly.idee8.agency/#website",
									"url": "https://waitly.idee8.agency",
									"name": "Idee8 — Next.js + Notion Waitlist Template",
									"description": "A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel."
								},
								{
									"@type": "Organization",
									"@id": "https://waitly.idee8.agency/#organization",
									"name": "Idee8",
									"url": "https://waitly.idee8.agency"
								},
								{
									"@type": "SoftwareApplication",
									"@id": "https://waitly.idee8.agency/#software",
									"name": "Next.js + Notion Waitlist Template",
									"description": "A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel.",
									"applicationCategory": "DeveloperApplication"
								}
							]
						}),
					}}
				/>
			</body>
		</html>
	);
}
