import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google"
import { getLocale } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorker } from "@/components/pwa/pwa"
import { siteConfig } from "@/config/site"
import "./globals.css"

const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const serif = IBM_Plex_Serif({ variable: "--font-plex-serif", subsets: ["latin"], weight: ["500", "600"] })
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: "Take class attendance for two breaks a day, in Somali or English.",
  applicationName: siteConfig.name,
  appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "default" },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

// Applies the stored/system theme and the sidebar state before first paint.
const init =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}if(localStorage.getItem('sidebar-collapsed')==='1')document.documentElement.classList.add('sidebar-collapsed')}catch(e){}})()"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: init }} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  )
}
