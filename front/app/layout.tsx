-
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
