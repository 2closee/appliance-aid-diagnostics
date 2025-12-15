import { Shield, Lock, Headphones, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PaymentProtectionBannerProps {
  variant?: "compact" | "detailed" | "checkout";
}

export function PaymentProtectionBanner({ variant = "compact" }: PaymentProtectionBannerProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Payment Protected</span>
          {" "}— Held securely until you confirm satisfaction
        </span>
      </div>
    );
  }

  if (variant === "checkout") {
    return (
      <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Payment Protected by FixBudi
              </p>
              <p className="text-sm text-muted-foreground">
                Your money is safe with us
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Escrow protection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>30-day warranty</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Dispute resolution</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>24/7 support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-600 rounded-full">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-200">
              Why Book Through FixBudi?
            </h3>
            <p className="text-sm text-muted-foreground">
              Your repairs are protected from start to finish
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
            <Lock className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium">Secure Escrow Payment</p>
              <p className="text-sm text-muted-foreground">
                Your payment is held securely until you confirm the repair is complete and satisfactory.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
            <Shield className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium">30-Day Warranty</p>
              <p className="text-sm text-muted-foreground">
                Every repair includes warranty coverage. If the issue returns, we'll coordinate a free fix.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
            <RefreshCw className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium">Dispute Resolution</p>
              <p className="text-sm text-muted-foreground">
                Issues with your repair? Our team mediates to ensure fair outcomes for everyone.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
            <Headphones className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium">24/7 Support</p>
              <p className="text-sm text-muted-foreground">
                Questions or concerns? Our support team is always available to help you.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
