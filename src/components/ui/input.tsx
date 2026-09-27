import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const fieldClass =
  "w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-[inset_0_1px_0_rgb(0_0_0/0.03)] placeholder:text-muted-foreground/80 transition-colors hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70"

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  const input = (
    <input
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(
        fieldClass,
        "h-10 py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground",
        error && "border-destructive focus-visible:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
  if (!error) return input
  return (
    <div className="flex flex-col gap-1">
      {input}
      <p className="text-xs text-destructive">{error}</p>
    </div>
  )
})

Input.displayName = "Input"

export { Input }
