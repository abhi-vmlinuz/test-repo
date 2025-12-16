import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:pr-10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-1/2 group-[.toast]:-translate-y-1/2 group-[.toast]:p-1.5 group-[.toast]:rounded-md group-[.toast]:text-gray-400 group-[.toast]:hover:text-gray-600 group-[.toast]:hover:bg-gray-100 group-[.toast]:transition-colors group-[.toast]:border-0 group-[.toast]:bg-transparent",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
