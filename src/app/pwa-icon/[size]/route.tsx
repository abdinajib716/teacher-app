import { appIcon } from "@/lib/app-icon"

/** PWA icons for the manifest: /pwa-icon/192 and /pwa-icon/512(?maskable=1). */
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const px = size === "512" ? 512 : 192
  const maskable = new URL(req.url).searchParams.has("maskable")
  return appIcon(px, { rounded: !maskable, padding: maskable ? 0.28 : 0.18 })
}
