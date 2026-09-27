/** App identity, read by the layout, the PWA manifest, emails and PDFs. */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Teacher Attendance",
  shortName: "Attendance",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  themeColor: "#1d3f6e",
}
