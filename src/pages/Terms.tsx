import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms & Conditions</CardTitle>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Service Description</h2>
              <p>
                Fixbudi operates as a platform connecting customers with verified repair centers for appliance repair services. 
                We facilitate the repair process but do not directly provide repair services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate information about your appliance and repair needs</li>
                <li>Ensure appliances are ready for pickup at scheduled times</li>
                <li>Make timely payments for completed repairs</li>
                <li>Treat repair center staff with respect</li>
                <li>Report any issues or concerns promptly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Payment Terms</h2>
              <p>
                Fixbudi charges a 7.5% service commission on all completed repairs. This fee covers platform maintenance, 
                customer support, and quality assurance. Payment is due upon repair completion before appliance return.
              </p>
              <p className="mt-2">
                All payments are processed securely through Stripe. Refunds are handled on a case-by-case basis according 
                to our refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Repair Center Obligations</h2>
              <p>Authorized repair centers must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide professional and quality repair services</li>
                <li>Communicate transparently with customers</li>
                <li>Provide accurate cost estimates</li>
                <li>Complete repairs within reasonable timeframes</li>
                <li>Handle customer property with care</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Dispute Resolution</h2>
              <p>
                In case of disputes between customers and repair centers, Fixbudi will mediate to reach a fair resolution. 
                Customers can file disputes through the platform within 7 days of service completion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
              <p>
                Fixbudi acts as an intermediary platform. While we verify repair centers, we are not liable for 
                the quality of repairs, damages, or losses incurred during the repair process. Repair centers maintain 
                independent liability for their services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Privacy</h2>
              <p>
                Your personal information is protected according to our Privacy Policy. We collect and use data solely 
                to facilitate repairs and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Termination Policy</h2>
              <p>
                Fixbudi reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent 
                activity, or disrupt platform operations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
              <p>
                These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved 
                in Nigerian courts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p>
                For questions about these terms, contact us at:<br/>
                Email: support@fixbudi.com<br/>
                Phone: +234 XXX XXX XXXX
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
