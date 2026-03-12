import type { Metadata } from "next";
import "./globals.css";
// Required for Excalidraw toolbar, shapes, and canvas controls
import "@excalidraw/excalidraw/index.css";

export const metadata: Metadata = {
  title: "Video Conference",
  description: "Video conference application",
};

import { SignalingProvider } from "@/providers/SignalingProvider";
import { Toaster } from "@/components/ui/sonner";

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
