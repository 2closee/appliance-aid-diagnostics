import { Star, Shield, Award, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreProps {
  averageRating?: number | null;
  totalReviews?: number | null;
  yearsOfExperience?: number | null;
  showVerified?: boolean;
  size?: "sm" | "md" | "lg";
  layout?: "horizontal" | "vertical" | "compact";
}

export function TrustScoreBadge({ 
  averageRating = 0, 
  totalReviews = 0,
  yearsOfExperience = 0,
  showVerified = true,
  size = "md",
  layout = "horizontal"
}: TrustScoreProps) {
  const rating = averageRating || 0;
  const reviews = totalReviews || 0;
  const years = yearsOfExperience || 0;

  // Calculate trust tier based on rating, reviews, and experience
  const getTrustTier = () => {
    const score = (rating * 0.4) + (Math.min(reviews, 100) / 100 * 0.3) + (Math.min(years, 10) / 10 * 0.3);
    if (score >= 0.8) return { tier: "Platinum", color: "bg-slate-700 text-white", icon: Award };
    if (score >= 0.6) return { tier: "Gold", color: "bg-amber-500 text-white", icon: Award };
    if (score >= 0.4) return { tier: "Silver", color: "bg-slate-400 text-white", icon: Award };
    return { tier: "Bronze", color: "bg-amber-700 text-white", icon: Award };
  };

  const trustTier = getTrustTier();
  const TierIcon = trustTier.icon;

  const sizeClasses = {
    sm: { text: "text-xs", icon: "h-3 w-3", star: "h-3 w-3", padding: "px-1.5 py-0.5" },
    md: { text: "text-sm", icon: "h-4 w-4", star: "h-4 w-4", padding: "px-2 py-1" },
    lg: { text: "text-base", icon: "h-5 w-5", star: "h-5 w-5", padding: "px-3 py-1.5" }
  };

  const sizes = sizeClasses[size];

  if (layout === "compact") {
    return (
      <div className="flex items-center gap-2">
        {rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className={`${sizes.star} fill-amber-400 text-amber-400`} />
            <span className={`font-medium ${sizes.text}`}>{rating.toFixed(1)}</span>
            {reviews > 0 && (
              <span className={`text-muted-foreground ${sizes.text}`}>({reviews})</span>
            )}
          </div>
        )}
        {showVerified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`${sizes.padding} ${sizes.text} gap-1 border-emerald-500/50 text-emerald-600`}>
                <CheckCircle className={sizes.icon} />
                Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verified by FixBudi</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  if (layout === "vertical") {
    return (
      <div className="space-y-2">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`${sizes.star} ${
                  star <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className={`font-medium ${sizes.text}`}>{rating.toFixed(1)}</span>
          <span className={`text-muted-foreground ${sizes.text}`}>
            ({reviews} review{reviews !== 1 ? "s" : ""})
          </span>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2">
          {showVerified && (
            <Badge variant="outline" className={`${sizes.padding} ${sizes.text} gap-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20`}>
              <Shield className={sizes.icon} />
              Verified by FixBudi
            </Badge>
          )}
          {reviews >= 10 && (
            <Badge className={`${sizes.padding} ${sizes.text} gap-1.5 ${trustTier.color}`}>
              <TierIcon className={sizes.icon} />
              {trustTier.tier} Repair Center
            </Badge>
          )}
        </div>

        {/* Experience */}
        {years > 0 && (
          <p className={`text-muted-foreground ${sizes.text}`}>
            {years}+ years of experience
          </p>
        )}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Rating Stars */}
      {rating > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`${sizes.star} ${
                  star <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className={`font-medium ${sizes.text}`}>{rating.toFixed(1)}</span>
          <span className={`text-muted-foreground ${sizes.text}`}>
            ({reviews})
          </span>
        </div>
      )}

      {/* Verified Badge */}
      {showVerified && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${sizes.padding} ${sizes.text} gap-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20`}>
              <Shield className={sizes.icon} />
              Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This repair center has been verified by FixBudi for quality and reliability.</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Trust Tier */}
      {reviews >= 10 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`${sizes.padding} ${sizes.text} gap-1.5 ${trustTier.color}`}>
              <TierIcon className={sizes.icon} />
              {trustTier.tier}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{trustTier.tier} status based on ratings, reviews, and experience.</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Experience */}
      {years > 0 && (
        <span className={`text-muted-foreground ${sizes.text}`}>
          {years}+ years
        </span>
      )}
    </div>
  );
}
