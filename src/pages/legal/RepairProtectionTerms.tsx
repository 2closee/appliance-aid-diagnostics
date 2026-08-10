import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, X, Truck, Wrench, CalendarClock, Scale } from "lucide-react";
import { DEFAULT_TIERS, PROTECTION_COVERED, PROTECTION_NOT_COVERED } from "@/lib/protection/pricing";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

const RepairProtectionTerms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>FixBudi Repair Protection Terms | 90-Day Same-Fault Cover</title>
        <meta
          name="description"
          content="How FixBudi Repair Protection works: 90 days of same-fault cover on phone and laptop repairs, free re-repair and free pickup and return. Full terms and pricing."
        />
        <link rel="canonical" href="https://fixbudi.lovable.app/legal/repair-protection" />
      </Helmet>

      <Navigation />

      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Badge className="mb-3">Service guarantee, not insurance</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">FixBudi Repair Protection</h1>
        <p className="mt-3 text-muted-foreground">
          An optional plan you can add when you pay for a phone or laptop repair. If the same fault
          comes back within 90 days, the repair centre fixes it free and we pay to move your device
          both ways.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wrench, title: "Free re-repair", body: "Same fault, no labour or parts charge." },
            { icon: Truck, title: "Free logistics", body: "Pickup and return, funded by FixBudi." },
            { icon: CalendarClock, title: "90 days", body: "From the day your device is returned." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <Icon className="mb-2 h-5 w-5 text-primary" />
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What it costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Repair Protection pricing by repair cost</caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2 pr-4 font-medium">Repair cost</th>
                    <th scope="col" className="py-2 font-medium">Protection fee</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_TIERS.map((t) => (
                    <tr key={t.min} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {t.max === null ? `Above ${naira(t.min)}` : `${naira(t.min)} – ${naira(t.max)}`}
                      </td>
                      <td className="py-2">
                        {t.flat != null
                          ? naira(t.flat)
                          : `${(t.rate! * 100).toFixed(0)}% of the repair, capped at ${naira(t.cap!)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The fee is charged once, together with your repair payment, and covers up to two claims
              in the 90-day window.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What's covered</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PROTECTION_COVERED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What's not covered</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PROTECTION_NOT_COVERED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Terms in full</h2>

          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              <strong>1. Eligibility.</strong> Repair Protection may be added to mobile phone and
              laptop repairs booked and paid for through FixBudi. It must be purchased at the time
              you pay for the repair and cannot be added afterwards.
            </p>
            <p>
              <strong>2. Cover period.</strong> Cover runs for 90 calendar days from the date your
              device is returned to you or collected by you after the repair.
            </p>
            <p>
              <strong>3. What a claim is.</strong> A claim is the recurrence of the specific fault
              your repair was engaged to fix, including failure of a part fitted during that repair.
            </p>
            <p>
              <strong>4. How to claim.</strong> Use "Report same issue" on your repair in your
              dashboard. The repair centre has 48 hours to accept or contest. If it accepts, a rider
              collects your device at no cost to you, the centre re-repairs it free of charge, and we
              return it to you.
            </p>
            <p>
              <strong>5. Contested claims.</strong> If the centre contests, FixBudi mediates using the
              intake and release photographs, the diagnostic record and your evidence, and issues a
              written decision within 7 days. If your claim is not upheld, you may be asked to pay
              transport for any further movement of the device.
            </p>
            <p>
              <strong>6. Claim limit.</strong> A plan funds up to two round trips within the 90-day
              window. Your repair centre's free re-repair obligation is not limited by that count.
            </p>
            <p>
              <strong>7. Exclusions.</strong> The plan does not cover new or unrelated faults, liquid
              or impact damage occurring after collection, tampering or repair by anyone else,
              consumables and normal battery wear, cosmetic wear, or loss, theft or destruction of
              the device.
            </p>
            <p>
              <strong>8. Not insurance.</strong> Repair Protection is a service guarantee: it funds
              logistics, handling and administration of your repair centre's workmanship warranty.
              FixBudi does not underwrite risk of loss or damage and does not carry on insurance
              business. The plan is not regulated by NAICOM.
            </p>
            <p>
              <strong>9. The fee.</strong> The fee is not a deposit and is not refundable once cover
              begins, save where the repair itself is refunded in full. Where no claim is made, the
              fee is retained by FixBudi at the end of the 90-day window.
            </p>
            <p>
              <strong>10. Non-transferable.</strong> Cover attaches to the repair and the device and
              cannot be transferred to another device or another person.
            </p>
            <p>
              <strong>11. Your statutory rights.</strong> Nothing here limits your rights under the
              Federal Competition and Consumer Protection Act 2018, applicable State consumer
              protection law, or your right to complain to the FCCPC. Your repair centre owes you a
              90-day workmanship warranty whether or not you buy this plan.
            </p>
            <p>
              <strong>12. Governing law.</strong> These terms are governed by the laws of the Federal
              Republic of Nigeria. Disputes not resolved by FixBudi mediation may be referred to
              arbitration under the Arbitration and Mediation Act 2023, seated in Port Harcourt,
              Rivers State.
            </p>
            <p>
              <strong>13. Data.</strong> Claim information is processed in line with the Nigeria Data
              Protection Act 2023 and our privacy policy.
            </p>
          </div>
        </section>

        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5" />
              For repair partners
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every FixBudi repair partner signs Schedule A — Workmanship Warranty and Repair
            Protection Undertaking, committing to a 90-day free re-repair on the same fault. Partners
            accept it in their dashboard; the full text is available there and in{" "}
            <code className="rounded bg-muted px-1">docs/legal/repair-protection-schedule-a.md</code>.
          </CardContent>
        </Card>

        <p className="mt-8 text-xs text-muted-foreground">
          Terms version v1.0. FixBudi may amend these terms; the version in force when you bought
          your plan governs your cover.
        </p>
      </main>
    </div>
  );
};

export default RepairProtectionTerms;
