import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { Wrench, Truck, CheckCircle, Clock } from "lucide-react";

interface DeliveryCost {
  type: string;
  estimated_cost: number;
  actual_cost?: number;
  cash_payment_status: string;
  app_delivery_commission?: number;
}

interface CostBreakdownCardProps {
  estimatedCost?: number;
  finalCost?: number;
  currency?: string;
  repairPaymentStatus?: string;
  deliveries?: DeliveryCost[];
}

export const CostBreakdownCard = ({
  estimatedCost,
  finalCost,
  currency = "NGN",
  repairPaymentStatus,
  deliveries = [],
}: CostBreakdownCardProps) => {
  const totalDeliveryCost = deliveries.reduce(
    (sum, d) => sum + (d.actual_cost || d.estimated_cost || 0),
    0
  );
  
  const totalDeliveryCommission = deliveries.reduce(
    (sum, d) => sum + (d.app_delivery_commission || 0),
    0
  );

  const grandTotal = (finalCost || estimatedCost || 0) + totalDeliveryCost;

  const paymentStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "success",
      pending: "warning",
      confirmed: "success",
      paid: "default",
      disputed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Cost Breakdown</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Repair Services Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="w-4 h-4" />
            <span>Repair Services</span>
          </div>
          
          {estimatedCost && (
            <div className="flex justify-between items-center text-sm pl-6">
              <span className="text-muted-foreground">Estimated Cost:</span>
              <span>{formatCurrency(estimatedCost, currency as any)}</span>
            </div>
          )}
          
          {finalCost && (
            <div className="flex justify-between items-center text-sm pl-6">
              <span className="text-muted-foreground">Final Cost:</span>
              <span className="font-semibold">{formatCurrency(finalCost, currency as any)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-sm pl-6">
            <span className="text-muted-foreground">Payment Method:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">Online (Paystack)</span>
              {repairPaymentStatus && paymentStatusBadge(repairPaymentStatus)}
            </div>
          </div>
        </div>

        {deliveries.length > 0 && (
          <>
            <Separator />
            
            {/* Delivery Services Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4" />
                <span>Delivery Services</span>
              </div>
              
              {deliveries.map((delivery, index) => (
                <div key={index} className="pl-6 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground capitalize">
                      {delivery.type.replace('_', ' ')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(
                          delivery.actual_cost || delivery.estimated_cost,
                          currency as any
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">(Cash to Rider)</span>
                      {paymentStatusBadge(delivery.cash_payment_status)}
                    </div>
                  </div>
                  
                  {delivery.app_delivery_commission && (
                    <div className="flex justify-between items-center text-xs text-muted-foreground pl-4">
                      <span>App Service Fee (5%):</span>
                      <span>{formatCurrency(delivery.app_delivery_commission, currency as any)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />

        {/* Totals Section */}
        <div className="space-y-2">
          {(finalCost || estimatedCost) && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Repair Cost (Online):</span>
              <span className="font-semibold">
                {formatCurrency(finalCost || estimatedCost || 0, currency as any)}
              </span>
            </div>
          )}
          
          {totalDeliveryCost > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Delivery Cost (Cash):</span>
              <span className="font-semibold">
                {formatCurrency(totalDeliveryCost, currency as any)}
              </span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <span className="font-bold">Grand Total:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(grandTotal, currency as any)}
            </span>
          </div>
          
          {totalDeliveryCommission > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              (Includes {formatCurrency(totalDeliveryCommission, currency as any)} service fee)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
