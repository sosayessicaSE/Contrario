import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contrario Notes",
  description: "Multi-tenant team notes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
