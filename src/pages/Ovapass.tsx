import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  Bike,
  BadgeCheck,
  Wallet,
  MapPin,
  Smartphone,
  IdCard,
  Users,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";

const steps = [
  {
    icon: IdCard,
    title: "Register in minutes",
    description: "Tell us about yourself and your bike, then upload your ID, a photo of your bike and a selfie.",
  },
  {
    icon: BadgeCheck,
    title: "Get verified",
    description: "Our team reviews your documents. Most riders hear back within 24 to 48 hours.",
  },
  {
    icon: MapPin,
    title: "Go online near you",
    description: "Flip the switch in the rider app and start receiving pickup requests from repair centers close to you.",
  },
  {
    icon: Wallet,
    title: "Get paid per trip",
    description: "Every completed pickup or return adds to your earnings. Track each trip in your rider dashboard.",
  },
];

const requirements = [
  { icon: Bike, title: "Your own bike", description: "Third-party riders ride their own bike. No bike? You can apply to ride a FixBudi electric bike." },
  { icon: Smartphone, title: "A smartphone", description: "You need a working Android or iPhone with data and location turned on." },
  { icon: IdCard, title: "Government ID", description: "NIN slip, driver's licence, voter's card or international passport." },
  { icon: Users, title: "A guarantor", description: "Someone we can reach who vouches for you — required because you carry customer devices." },
];

const faqs = [
  {
    q: "Do I need to own a bike to join?",
    a: "Third-party riders use their own bike, and that is the fastest way to get approved. If you don't own one, choose the FixBudi electric bike option when you register and we will contact you when a bike is available.",
  },
  {
    q: "How and when do I get paid?",
    a: "You earn a fee on every completed trip. Riders collect cash on delivery, and your rider dashboard shows what you earned and what you owe FixBudi in commission. Settlement happens weekly.",
  },
  {
    q: "How do I know a pickup is genuine?",
    a: "Every handover is protected by a one-time code. You enter the customer's code when you collect the device and the repair center's code when you drop it off, plus you upload condition photos so nobody can dispute the device's state.",
  },
  {
    q: "Which areas can I work in?",
    a: "Ovapass runs in Port Harcourt today, with pickups kept close to partner repair centers so you can complete several trips a day. More cities follow as we add centers.",
  },
  {
    q: "Will Ovapass stay inside FixBudi?",
    a: "For now you ride from inside the FixBudi app. Ovapass will get its own app later, and your rider account and trip history come with you.",
  },
];

const Ovapass = () => {
  const { user } = useAuth();
  const [hasRiderProfile, setHasRiderProfile] = useState(false);

  useEffect(() => {
    trackEvent("ovapass_landing_view");
  }, []);

  useEffect(() => {
    if (!user) {
      setHasRiderProfile(false);
      return;
    }
    let active = true;
    supabase
      .from("riders")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setHasRiderProfile(!!data);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const ctaHref = hasRiderProfile ? "/rider" : "/rider/signup";
  const ctaLabel = hasRiderProfile ? "Open your rider dashboard" : "Register as a rider";

  const Cta = ({ className }: { className?: string }) => (
    <Button size="lg" className={className} asChild onClick={() => trackEvent("ovapass_register_click")}>
      <Link to={ctaHref}>
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ride with Ovapass — Earn Delivering for FixBudi</title>
        <meta
          name="description"
          content="Register as an Ovapass rider and earn on every device you pick up or return for FixBudi repair centers in Port Harcourt. Own bike welcome."
        />
        <meta property="og:title" content="Ride with Ovapass — Earn Delivering for FixBudi" />
        <meta
          property="og:description"
          content="Use your own bike to pick up and deliver phones and laptops for FixBudi repair centers. Register in minutes."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fixbudi.lovable.app/ovapass" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ride with Ovapass — Earn Delivering for FixBudi" />
        <meta
          name="twitter:description"
          content="Use your own bike to pick up and deliver phones and laptops for FixBudi repair centers. Register in minutes."
        />
        <link rel="canonical" href="https://fixbudi.lovable.app/ovapass" />
      </Helmet>

      <Navigation />

      {/* Hero */}
      <section className="pt-24 pb-14 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-5xl px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Bike className="mr-2 h-3.5 w-3.5" /> Ovapass riders
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Ride with Ovapass. Deliver for FixBudi.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Ovapass is FixBudi's rider network. Use your own bike to pick up phones and laptops from
            customers, drop them at partner repair centers, and get paid on every trip.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Cta className="w-full sm:w-auto" />
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" /> Own bike welcome
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Work when you're online
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Code-protected handovers
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Card key={step.title} className="h-full">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">What you need to start</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {requirements.map((item) => (
              <Card key={item.title} className="h-full">
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How earnings work</h2>
          <Card className="mt-8">
            <CardContent className="space-y-4 pt-6 text-sm text-muted-foreground">
              <p className="flex gap-3">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Each trip has a fee based on distance. You keep your rider earning on the trip and FixBudi
                  keeps a commission — both shown to you before and after every job.
                </span>
              </p>
              <p className="flex gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Riders collect cash on delivery today. Your dashboard tracks what you earned and what
                  commission you owe, and you settle weekly.
                </span>
              </p>
              <p className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Every handover needs a one-time code plus condition photos, so devices and your record are
                  both protected.
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Rider questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to start riding?</h2>
          <p className="mt-3 text-muted-foreground">
            Register as an Ovapass rider today and start picking up FixBudi jobs once you're verified.
          </p>
          <Cta className="mt-8" />
        </div>
      </section>
    </div>
  );
};

export default Ovapass;
