import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Looplight | Finish the care handoff",
  description:
    "Source-grounded follow-ups for patients and caregivers. A UnivaBio project by Shivam Gupta.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
