import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Phone, User, Package, Clock, ExternalLink, X } from "lucide-react";
import { format } from "date-fns";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";

interface DeliveryRequest {
  id: string;
  delivery_type: string;
  delivery_status: string;
  pickup_address: string;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_details?: string;
  estimated_cost?: number;
  actual_cost?: number;
  tracking_url?: string;
  scheduled_pickup_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  notes?: string;
}

interface DeliveryTrackingProps {
  deliveryRequest: DeliveryRequest;
  onCancel?: () => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  driver_on_way: "bg-purple-100 text-purple-800",
  driver_arrived: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_transit: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Assignment",
  assigned: "Driver Assigned",
  driver_on_way: "Driver On The Way",
  driver_arrived: "Driver Arrived",
  picked_up: "Item Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  failed: "Delivery Failed",
  cancelled: "Cancelled",
};

export const DeliveryTracking = ({ deliveryRequest, onCancel }: DeliveryTrackingProps) => {
  const { cancelDelivery, isCancellingDelivery } = useDeliveryActions();

  const handleCancelDelivery = async () => {
    if (window.confirm("Are you sure you want to cancel this delivery?")) {
      try {
        await cancelDelivery(deliveryRequest.id);
        onCancel?.();
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const canCancel = ["pending", "assigned", "driver_on_way"].includes(deliveryRequest.delivery_status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {deliveryRequest.delivery_type === "pickup" ? "Pickup" : "Return"} Delivery
          </CardTitle>
          <Badge className={statusColors[deliveryRequest.delivery_status] || "bg-gray-100 text-gray-800"}>
            {statusLabels[deliveryRequest.delivery_status] || deliveryRequest.delivery_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Addresses */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pickup Location</p>
                <p className="text-sm text-muted-foreground">{deliveryRequest.pickup_address}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Delivery Location</p>
                <p className="text-sm text-muted-foreground">{deliveryRequest.delivery_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        {deliveryRequest.driver_name && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Driver Information</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="text-sm font-medium">{deliveryRequest.driver_name}</p>
                </div>
              </div>
              {deliveryRequest.driver_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{deliveryRequest.driver_phone}</p>
                  </div>
                </div>
              )}
              {deliveryRequest.vehicle_details && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm font-medium">{deliveryRequest.vehicle_details}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Delivery Timeline</h4>
          <div className="space-y-2 text-sm">
            {deliveryRequest.scheduled_pickup_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Scheduled:</span>
                <span className="font-medium">
                  {format(new Date(deliveryRequest.scheduled_pickup_time), "PPp")}
                </span>
              </div>
            )}
            {deliveryRequest.actual_pickup_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Picked up:</span>
                <span className="font-medium">
                  {format(new Date(deliveryRequest.actual_pickup_time), "PPp")}
                </span>
              </div>
            )}
            {deliveryRequest.actual_delivery_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Delivered:</span>
                <span className="font-medium">
                  {format(new Date(deliveryRequest.actual_delivery_time), "PPp")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cost */}
        {(deliveryRequest.estimated_cost || deliveryRequest.actual_cost) && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {deliveryRequest.actual_cost ? "Delivery Cost:" : "Estimated Cost:"}
              </span>
              <span className="font-medium">
                ₦{((deliveryRequest.actual_cost || deliveryRequest.estimated_cost) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        {deliveryRequest.notes && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">{deliveryRequest.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {deliveryRequest.tracking_url && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={deliveryRequest.tracking_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Track Delivery
              </a>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelDelivery}
              disabled={isCancellingDelivery}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
