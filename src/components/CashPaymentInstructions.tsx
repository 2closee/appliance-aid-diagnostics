import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { Banknote, AlertCircle } from "lucide-react";

interface CashPaymentInstructionsProps {
  amount: number;
  currency?: string;
  status?: string;
  variant?: "default" | "compact";
}

export const CashPaymentInstructions = ({
  amount,
  currency = "NGN",
  status = "pending",
  variant = "default",
}: CashPaymentInstructionsProps) => {
  const statusColors: Record<string, string> = {
    pending: "warning",
    paid: "default",
    confirmed: "success",
    disputed: "destructive",
  };

  const statusLabels: Record<string, string> = {
    pending: "Payment Pending",
    paid: "Paid by Customer",
    confirmed: "Payment Confirmed",
    disputed: "Payment Disputed",
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Cash to Rider:</span>
          <span className="font-bold">{formatCurrency(amount, currency as any)}</span>
        </div>
        <Badge variant={statusColors[status] as any}>
          {statusLabels[status] || status}
        </Badge>
      </div>
    );
  }

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Cash Payment to Rider</span>
        <Badge variant={statusColors[status] as any}>
          {statusLabels[status] || status}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold">{formatCurrency(amount, currency as any)}</span>
        </div>
        
        {status === "pending" && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">Important Instructions:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Payment is made directly to the delivery rider in cash</li>
              <li>Have exact change ready to avoid delays</li>
              <li>Request and keep the receipt from the rider</li>
              <li>Do not pay until your item is received</li>
            </ul>
          </div>
        )}

        {status === "confirmed" && (
          <p className="text-sm text-muted-foreground">
            Payment has been confirmed. Thank you!
          </p>
        )}

        {status === "disputed" && (
          <p className="text-sm text-destructive">
            There is a dispute about this payment. Our support team will contact you shortly.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
