import { cn } from "@/lib/utils";
export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select className={cn("field", className)} {...props} />;
}
