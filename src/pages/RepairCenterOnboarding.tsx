import { CheckCircle2, XCircle, Truck, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

const Row = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    {ok ? (
      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
    )}
    <span className="text-sm">{children}</span>
  </li>
);

export default function RepairCenterOnboarding() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-3xl py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Repair Center Workflow SOP</h1>
          <p className="text-muted-foreground">
            How gadgets and bulky items are handled on Fixbudi. Please train all staff.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Gadgets (phones, laptops, tablets, consoles, cameras)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <Row ok={false}>
                Do <strong>not</strong> arrange your own pickup. Fixbudi dispatches a vetted bike
                rider automatically via our logistics API.
              </Row>
              <Row ok={true}>
                Wait for the "Rider en route" status in your dashboard.
              </Row>
              <Row ok={true}>
                On arrival, the rider will hand the device with a customer-signed condition photo.
                Verify the device matches, then update job status to "In repair."
              </Row>
              <Row ok={true}>
                When repair is complete, click "Ready for return." Fixbudi dispatches the return
                rider automatically.
              </Row>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Bulky items (ACs, TVs, fridges, washers, generators)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <Row ok={true}>
                You will receive a notification: "Bulky pickup requested." Contact the customer
                within <strong>2 hours</strong>.
              </Row>
              <Row ok={true}>
                Arrange specialized transport (van/truck) using your own logistics. Confirm any
                transport cost with the customer before pickup.
              </Row>
              <Row ok={true}>
                Update the job's "Bulky pickup queue" widget from "Contacted" → "Picked up" as the
                job progresses.
              </Row>
              <Row ok={false}>
                Do <strong>not</strong> request a Fixbudi rider for bulky items — bike riders can't
                transport them.
              </Row>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/40">
          <CardContent className="p-6 text-sm">
            <strong>Why this split?</strong> Fixbudi controls gadget logistics end-to-end to
            protect high-value, data-sensitive devices with OTP handoff and condition photos.
            Bulky items don't fit that model, so we hand them back to your local logistics.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
