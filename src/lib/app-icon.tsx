import { ImageResponse } from "next/og"

/**
 * The app icon drawn in code (a corner of the register sheet, as in the logo), so
 * the favicon, the Apple touch icon and the PWA icons are always the same.
 * `padding` shrinks the mark for maskable icons, whose edges get cropped.
 */
export function appIcon(size: number, { rounded = true, padding = 0.18 } = {}) {
  const mark = Math.round(size * (1 - padding * 2))
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d3f6e",
          borderRadius: rounded ? Math.round(size * 0.22) : 0,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
          <path d="M3 9h18M3 15h18M12 3v18" stroke="#ffffff" strokeWidth="1.4" opacity="0.55" />
          <rect x="4.6" y="4.6" width="5.8" height="2.8" rx="0.6" fill="#ffffff" />
          <path d="m13.8 12 1.6 1.5 3-3.1" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
