import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "PDFdecor — Free Online PDF Editor & Tools: Merge, Split, Compress, Convert",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Free online PDF tools — edit, merge, split, compress, convert, sign, and watermark PDF files in your browser. No sign-up, no watermark, no install.",
  keywords: [
    "pdf", "pdf editor", "edit pdf", "edit pdf free", "pdf tools",
    "merge pdf", "split pdf", "compress pdf", "convert pdf",
    "pdf to word", "jpg to pdf", "sign pdf", "free pdf editor online",
    "pdf editor online free no sign up",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "PDFdecor — Free Online PDF Editor & Tools",
    description:
      "Edit, merge, split, compress, convert, and sign PDF files free in your browser. No sign-up, no watermark.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFdecor — Free Online PDF Editor & Tools",
    description:
      "Edit, merge, split, compress, convert, and sign PDF files free in your browser. No sign-up, no watermark.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
