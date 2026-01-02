import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Sparkles } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getToastIcon = (variant?: string) => {
    const iconClass = "w-5 h-5 flex-shrink-0"
    
    switch(variant) {
      case "success":
        return <CheckCircle2 className={iconClass} />
      case "destructive":
        return <AlertCircle className={iconClass} />
      case "warning":
        return <AlertTriangle className={iconClass} />
      case "info":
        return <Info className={iconClass} />
      default:
        return <Sparkles className={iconClass} />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {getToastIcon(variant as string)}
              </div>
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-sm opacity-95">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
