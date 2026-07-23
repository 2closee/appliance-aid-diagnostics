import { AlertCircle, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BulkyPickupNoticeProps {
  applianceType: string;
  centerName?: string;
}

export const BulkyPickupNotice = ({ applianceType, centerName }: BulkyPickupNoticeProps) => {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Truck className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Specialized pickup arranged by repair center</h3>
            <p className="text-sm text-muted-foreground">
              Because your <span className="font-medium">{applianceType}</span> is a bulky item,
              our on-demand bike rider network isn't suitable.
              {centerName ? ` ${centerName}` : " Our partner service center"} will contact you within
              2 hours to schedule a specialized pickup using their own logistics.
            </p>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/60 rounded-md p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                No pickup fee is charged here — the repair center will confirm any transport cost
                directly with you before pickup.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
