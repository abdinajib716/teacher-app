import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"

/**
 * PWA manifest: installable from the browser with a home-screen icon, full
 * screen. Online only by design — there is no service worker caching data.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: "Take class attendance for two breaks a day.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["education", "productivity"],
    shortcuts: [
      { name: "Take Attendance", short_name: "Attendance", url: "/attendance", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "Monthly Register", short_name: "Register", url: "/register", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
    background_color: "#f6f4ee",
    theme_color: siteConfig.themeColor,
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
