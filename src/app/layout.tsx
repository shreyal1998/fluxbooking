import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ReadingProgress } from "@/components/reading-progress";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FluxBooking - Book. Manage. Grow.",
  description: "The universal booking system for every business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NextTopLoader
              color="#4f46e5"
              height={3}
              showSpinner={false}
              zIndex={1000000}
            />
            {children}
            <ScrollToTop />
            <ReadingProgress />
            <Toaster 
              position="top-right" 
              richColors 
              closeButton 
              expand={true} 
              toastOptions={{
                style: {
                  zIndex: 2147483647,
                },
                className: "sonner-toast-high-z",
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
