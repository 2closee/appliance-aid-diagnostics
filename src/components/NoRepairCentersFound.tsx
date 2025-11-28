import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Sparkles, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RecommendRepairCenterDialog } from "./RecommendRepairCenterDialog";

export const NoRepairCentersFound = () => {
  const navigate = useNavigate();
  const [showRecommendDialog, setShowRecommendDialog] = useState(false);

  return (
    <>
      <Card className="border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-muted/10">
        <CardContent className="py-12 px-6 text-center space-y-6">
          {/* Icon */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
            <div className="relative bg-primary/10 rounded-full p-6">
              <MapPin className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-3 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-foreground">
              No Verified Centers Here... Yet!
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed">
              We're expanding our network of trusted repair experts, but we haven't verified any centers in your location.
            </p>
          </div>

          {/* Value Proposition */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start gap-3 text-left">
              <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Know a reliable repair technician?
                </p>
                <p className="text-xs text-muted-foreground">
                  Help us bring verified repair services to your area! Recommend a trusted repair center and we'll reach out to them.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={() => setShowRecommendDialog(true)}
              className="gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              Recommend a Repair Center
            </Button>
            <Button
              variant="outline"
              asChild
              className="gap-2"
              size="lg"
            >
              <a href="mailto:support@fixbudi.com">
                <MessageCircle className="h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-muted-foreground pt-4">
            We verify all repair centers to ensure they meet our quality and service standards
          </p>
        </CardContent>
      </Card>

      <RecommendRepairCenterDialog
        open={showRecommendDialog}
        onOpenChange={setShowRecommendDialog}
      />
    </>
  );
};
