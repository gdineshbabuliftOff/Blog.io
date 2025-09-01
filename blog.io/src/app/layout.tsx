import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blog.io",
  description: "It is a blog and portfolio website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
