import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface ProtectionBadgeProps {
  status: string;
  expiresAt: string;
  claimsUsed?: number;
  maxClaims?: number;
}

export function ProtectionBadge({ status, expiresAt, claimsUsed = 0, maxClaims = 2 }: ProtectionBadgeProps) {
  const expired = status === "expired" || new Date(expiresAt) < new Date();
  const daysLeft = differenceInDays(new Date(expiresAt), new Date());

  if (expired) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <ShieldOff className="h-3 w-3" />
        Protection ended
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Protected · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Cover runs to {format(new Date(expiresAt), "d MMM yyyy")}. {maxClaims - claimsUsed} of{" "}
        {maxClaims} claims remaining.
      </TooltipContent>
    </Tooltip>
  );
}
