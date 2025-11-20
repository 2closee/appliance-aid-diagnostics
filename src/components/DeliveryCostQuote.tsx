import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { MapPin, Clock, Truck, DollarSign, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeliveryQuote {
  estimated_cost: number;
  currency: string;
  estimated_time_minutes: number;
  distance_km?: number;
  vehicle_type: string;
  app_commission: number;
  total_customer_pays: number;
  quote_expires_at?: string;
}

interface DeliveryCostQuoteProps {
  pickupAddress: string;
  deliveryAddress: string;
  quote: DeliveryQuote | null;
  isLoading: boolean;
  onGetQuote: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeliveryCostQuote = ({
  pickupAddress,
  deliveryAddress,
  quote,
  isLoading,
  onGetQuote,
  onConfirm,
  onCancel,
}: DeliveryCostQuoteProps) => {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Delivery Cost Estimate</h3>
        
        {/* Addresses */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Pickup Address</p>
              <p className="text-sm text-muted-foreground">{pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Delivery Address</p>
              <p className="text-sm text-muted-foreground">{deliveryAddress}</p>
            </div>
          </div>
        </div>

        {!quote && !isLoading && (
          <Button onClick={onGetQuote} className="w-full">
            Get Delivery Quote
          </Button>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Getting quote...</p>
          </div>
        )}

        {quote && (
          <div className="space-y-4">
            {/* Cost Breakdown */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Vehicle Type</span>
                </div>
                <Badge variant="secondary">{quote.vehicle_type}</Badge>
              </div>

              {quote.distance_km && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{quote.distance_km} km</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. Time</span>
                </div>
                <span className="font-medium">{quote.estimated_time_minutes} mins</span>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Delivery Cost</span>
                  <span className="font-medium">{formatCurrency(quote.estimated_cost, quote.currency as any)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>App Service Fee (5%)</span>
                  <span>{formatCurrency(quote.app_commission, quote.currency as any)}</span>
                </div>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Total to Pay Rider</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(quote.total_customer_pays, quote.currency as any)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Payment Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Cash Payment Instructions:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Payment is made directly to the rider in cash</li>
                  <li>Have exact change ready: {formatCurrency(quote.total_customer_pays, quote.currency as any)}</li>
                  <li>Request a receipt from the rider</li>
                  <li>Quote valid for 15 minutes</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={onConfirm} className="flex-1">
                Confirm & Schedule Delivery
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
