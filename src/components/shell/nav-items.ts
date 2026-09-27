import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileUp,
  History,
  LayoutGrid,
  School,
  Settings,
  UserRound,
  Users,
} from "lucide-react"

/** The ten sidebar items, in PRD order, grouped the way a teacher's day runs. */
export const NAV_GROUPS = [
  {
    key: "daily",
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutGrid },
      { href: "/attendance", key: "attendance", icon: ClipboardCheck },
      { href: "/register", key: "register", icon: CalendarDays },
    ],
  },
  {
    key: "school",
    items: [
      { href: "/classes", key: "classes", icon: School },
      { href: "/students", key: "students", icon: UserRound },
      { href: "/guardians", key: "guardians", icon: Users },
    ],
  },
  {
    key: "insight",
    items: [
      { href: "/records", key: "records", icon: History },
      { href: "/reports", key: "reports", icon: BarChart3 },
      { href: "/import", key: "import", icon: FileUp },
    ],
  },
  {
    key: "account",
    items: [{ href: "/settings", key: "settings", icon: Settings }],
  },
] as const
