import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { cookies } from "next/headers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const activeTheme = themeCookie || "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${activeTheme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme={activeTheme}
            enableSystem={!themeCookie || themeCookie === "system"}
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
          <ScrollToTop />
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
      </body>
    </html>
  );
}
