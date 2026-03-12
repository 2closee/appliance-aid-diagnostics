import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import {
  Shield,
  Users,
  BarChart3,
  Truck,
  Megaphone,
  Headphones,
  CheckCircle,
  ArrowRight,
  Star,
  ClipboardCheck,
  BadgeCheck,
  Wrench,
  Quote,
} from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Guaranteed Payments",
    description:
      "Funds are held in escrow and released to you once the customer confirms satisfaction. No more chasing payments.",
  },
  {
    icon: Users,
    title: "Steady Customer Flow",
    description:
      "Get matched with customers in your area who need repairs. We bring the jobs to you.",
  },
  {
    icon: BarChart3,
    title: "Business Dashboard",
    description:
      "Track earnings, jobs, ratings, and performance analytics — all from one place.",
  },
  {
    icon: Truck,
    title: "Delivery Logistics",
    description:
      "We handle pickup and delivery of devices so you can focus on what you do best — repairs.",
  },
  {
    icon: Megaphone,
    title: "Marketing & Visibility",
    description:
      "Your center is listed and promoted to thousands of customers searching for trusted repair services.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our partner success team is always available to help you resolve issues and grow your business.",
  },
];

const steps = [
  {
    icon: ClipboardCheck,
    step: "1",
    title: "Apply Online",
    description: "Fill out a short application with your business details. It takes less than 5 minutes.",
  },
  {
    icon: BadgeCheck,
    step: "2",
    title: "Get Verified",
    description: "Our team reviews your application and verifies your business credentials.",
  },
  {
    icon: Wrench,
    step: "3",
    title: "Start Receiving Jobs",
    description: "Once approved, you'll start getting repair requests from customers near you.",
  },
];

const testimonials = [
  {
    name: "Chinedu O.",
    location: "Lagos, Nigeria",
    rating: 5,
    quote:
      "Since joining FixBudi, my monthly revenue has doubled. The escrow system means I always get paid on time.",
  },
  {
    name: "Amara K.",
    location: "Abuja, Nigeria",
    rating: 5,
    quote:
      "The customer flow is incredible. I used to spend hours looking for clients — now they come to me through FixBudi.",
  },
  {
    name: "Tunde B.",
    location: "Port Harcourt, Nigeria",
    rating: 5,
    quote:
      "The dashboard and analytics help me understand my business better. FixBudi is a game-changer for repair shops.",
  },
];

export default function JoinRepairCenter() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
            🚀 Now Accepting Partner Applications
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Grow Your Repair Business with{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              FixBudi
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join Nigeria's trusted repair network. Get more customers, guaranteed payments, and the tools to scale your business — all for free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="sparkly" asChild className="text-base px-8">
              <Link to="/apply-repair-center">
                Apply Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Partner with FixBudi?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to run a successful repair business, handled for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((b, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow border-border/60">
                <CardContent className="p-6">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
                  <p className="text-muted-foreground">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Getting started is simple. You could be receiving your first job within days.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary text-primary-foreground text-2xl font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold">500+</div>
              <p className="text-sm opacity-80 mt-1">Repairs Completed</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-1">
                4.8 <Star className="h-5 w-5 fill-current" />
              </div>
              <p className="text-sm opacity-80 mt-1">Average Rating</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">98%</div>
              <p className="text-sm opacity-80 mt-1">Partner Satisfaction</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">₦5,000</div>
              <p className="text-sm opacity-80 mt-1">Referral Bonus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Partners Say
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hear from repair center owners who are already growing with FixBudi.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-foreground mb-4 leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join FixBudi today — it's completely free. Plus, earn ₦5,000 for every repair center you refer that gets approved.
          </p>
          <Button size="lg" variant="sparkly" asChild className="text-base px-10">
            <Link to="/apply-repair-center">
              Apply Now — It's Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            <CheckCircle className="h-4 w-4 inline mr-1 text-success" />
            No fees, no commitments. Apply in under 5 minutes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FixBudi. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
