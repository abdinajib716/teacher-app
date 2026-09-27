"use client"

import { Toaster as SonnerToaster, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={88}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-md !border !border-border-strong !bg-popover !text-popover-foreground !shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)] !font-sans !text-sm",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-present",
          error: "[&_[data-icon]]:!text-absent",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
