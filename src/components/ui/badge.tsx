import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { HTMLAttributes } from "react"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[11px] font-semibold uppercase leading-4 tracking-wide",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary-soft text-primary",
        secondary: "border-border-strong bg-muted text-muted-foreground",
        success: "border-present/25 bg-present-bg text-present",
        destructive: "border-absent/25 bg-absent-bg text-absent",
        warning: "border-excused/25 bg-excused-bg text-excused",
        outline: "border-border-strong text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
