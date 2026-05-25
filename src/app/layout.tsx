import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArangoGraph Studio — AI Graph Workspace",
  description:
    "AI-powered graph schema designer and data seeder for ArangoGraph Managed Cloud.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
