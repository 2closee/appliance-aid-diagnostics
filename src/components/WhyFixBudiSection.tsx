import { Shield, Lock, Clock, Award, Headphones, RefreshCw, CheckCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WhyFixBudiSectionProps {
  variant?: "homepage" | "checkout" | "jobDetail";
}

export function WhyFixBudiSection({ variant = "homepage" }: WhyFixBudiSectionProps) {
  const benefits = [
    {
      icon: Lock,
      title: "Secure Escrow Payment",
      description: "Your money is held safely until you confirm the repair is complete and you're satisfied.",
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
    },
    {
      icon: Shield,
      title: "30-Day Warranty",
      description: "Every repair comes with automatic warranty. If the issue returns, we'll fix it free.",
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30"
    },
    {
      icon: Award,
      title: "Verified Repair Centers",
      description: "All repair centers are vetted for quality, experience, and customer satisfaction.",
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30"
    },
    {
      icon: RefreshCw,
      title: "Dispute Resolution",
      description: "If something goes wrong, our team mediates to ensure fair outcomes for everyone.",
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
    },
    {
      icon: Clock,
      title: "Track Your Repair",
      description: "Real-time status updates from pickup to delivery. Know exactly where your device is.",
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30"
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Questions or concerns? Our support team is always ready to help you.",
      color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30"
    }
  ];

  if (variant === "checkout") {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            You're Protected with FixBudi
          </h3>
          <div className="space-y-2">
            {benefits.slice(0, 4).map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>{benefit.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "jobDetail") {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-emerald-600" />
            Your Protection Benefits
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>Escrow Payment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>30-Day Warranty</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>Dispute Resolution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>24/7 Support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Homepage variant
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
            <Shield className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-emerald-700 dark:text-emerald-400">Protected Repairs</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Book Through FixBudi?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Skip the risk of unverified technicians. Every repair through FixBudi comes with comprehensive protection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${benefit.color}`}>
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary">500+</div>
            <p className="text-sm text-muted-foreground">Repairs Completed</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
              4.8 <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">98%</div>
            <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">24/7</div>
            <p className="text-sm text-muted-foreground">Support Available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
