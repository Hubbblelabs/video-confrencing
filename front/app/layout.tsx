import type { Metadata } from "next";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";
import { SignalingProvider } from "@/providers/SignalingProvider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Video Conference",
  description: "Video conferencing application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <SignalingProvider>
          {children}
          <Toaster />
        </SignalingProvider>
      </body>
    </html>
  );
}
