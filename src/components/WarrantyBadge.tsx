import { Shield, ShieldCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays, format } from "date-fns";

interface WarrantyBadgeProps {
  warrantyEndDate?: string | null;
  warrantyType?: "standard" | "extended" | "premium";
  size?: "sm" | "md" | "lg";
  showDaysRemaining?: boolean;
}

export function WarrantyBadge({ 
  warrantyEndDate, 
  warrantyType = "standard",
  size = "md",
  showDaysRemaining = true 
}: WarrantyBadgeProps) {
  if (!warrantyEndDate) return null;

  const endDate = new Date(warrantyEndDate);
  const now = new Date();
  const daysRemaining = differenceInDays(endDate, now);
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  if (isExpired) {
    return (
      <Badge variant="outline" className={`${sizeClasses[size]} gap-1.5 border-muted-foreground/30 text-muted-foreground`}>
        <Shield className={iconSizes[size]} />
        <span>Warranty Expired</span>
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${sizeClasses[size]} gap-1.5 ${
            isExpiringSoon 
              ? "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20" 
              : "border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
          }`}
        >
          <ShieldCheck className={iconSizes[size]} />
          <span>FixBudi Protected</span>
          {showDaysRemaining && (
            <>
              <span className="mx-1 opacity-50">•</span>
              <Clock className={`${iconSizes[size]} opacity-70`} />
              <span className="opacity-90">{daysRemaining}d left</span>
            </>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">
            {warrantyType.charAt(0).toUpperCase() + warrantyType.slice(1)} Warranty
          </p>
          <p className="text-xs text-muted-foreground">
            Valid until {format(endDate, "MMM d, yyyy")}
          </p>
          <p className="text-xs">
            If the same issue recurs, FixBudi will coordinate a free re-repair.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
