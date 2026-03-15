import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export default function Loader({ size = "md", className, fullPage }: LoaderProps) {
  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-neutral-300 border-t-primary-600",
        sizeClasses[size],
        className
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
