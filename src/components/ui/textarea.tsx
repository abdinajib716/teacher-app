import { cn } from "@/lib/utils"
import { TextareaHTMLAttributes, forwardRef } from "react"
import { fieldClass } from "./input"

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, "min-h-24 py-2", className)} {...props} />
))

Textarea.displayName = "Textarea"

export { Textarea }
