import type { Metadata, Viewport } from "next";

import { CartProvider } from "@/context/CartContext";
import { ShipCountryProvider } from "@/context/ShipCountryContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { ConfirmDialogProvider } from "@/context/ConfirmDialogContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AIAssistantProvider } from "@/context/AIAssistantContext";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIAssistantPanel from "@/components/AIAssistantPanel";

import "./globals.css";

const inter = { variable: "" };
const poppins = { variable: "" };

const SITE_NAME = "TradeHub";

const SITE_URL = "https://tradehub-example.vercel.app";

const SITE_DESCRIPTION =
  "TradeHub connects buyers with verified suppliers across automobiles, tech, home, tools, and more — browse, compare, and order in bulk with confidence.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} — Wholesale marketplace for verified suppliers`,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Wholesale marketplace for verified suppliers`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Wholesale marketplace for verified suppliers`,
    description: SITE_DESCRIPTION,
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d6efd",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>

      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>

        <AuthProvider>
          <AuthModalProvider>
            <ConfirmDialogProvider>
              <CartProvider>
                <WishlistProvider>
                  <ShipCountryProvider>
                    <CurrencyProvider>
                      <AIAssistantProvider>
                        <Navbar />

                        <main id="main">{children}</main>

                        <Footer />

                        <AIAssistantPanel />
                      </AIAssistantProvider>
                    </CurrencyProvider>
                  </ShipCountryProvider>
                </WishlistProvider>
              </CartProvider>
            </ConfirmDialogProvider>
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}