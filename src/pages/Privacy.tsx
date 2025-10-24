import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Compliant with Nigeria Data Protection Regulation (NDPR)
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Data Collection</h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Information:</strong> Name, email address, phone number, physical address</li>
                <li><strong>Device Information:</strong> Appliance type, brand, model, issue descriptions</li>
                <li><strong>Diagnostic Data:</strong> Photos, videos, and audio recordings you provide</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store card details)</li>
                <li><strong>Usage Data:</strong> How you interact with our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Data</h2>
              <p>Your information is used to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Facilitate repair services between you and repair centers</li>
                <li>Process payments and maintain transaction records</li>
                <li>Provide AI-powered diagnostic assistance</li>
                <li>Send service updates and notifications</li>
                <li>Improve our platform and services</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Data Storage & Security</h2>
              <p>
                Your data is stored securely using Supabase (PostgreSQL) with encryption at rest and in transit. 
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Row-Level Security (RLS) policies</li>
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
              <p className="mt-2">
                Data is retained for as long as your account is active or as needed to provide services. 
                You can request deletion at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
              <p>We share data with trusted third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>OpenAI:</strong> AI diagnostic assistance (anonymized data)</li>
                <li><strong>Resend:</strong> Email notifications</li>
              </ul>
              <p className="mt-2">
                These providers are bound by strict data protection agreements and use data only for specified purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Sharing with Repair Centers</h2>
              <p>
                When you request a repair, we share necessary information with the assigned repair center including 
                your name, contact details, address, and appliance information. Repair centers are contractually 
                obligated to protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Rights (NDPR Compliance)</h2>
              <p>Under Nigerian data protection law, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request removal of your data ("right to be forgotten")</li>
                <li><strong>Portability:</strong> Export your data in a structured format</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
                <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact our Data Protection Officer at dpo@fixbudi.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies & Tracking</h2>
              <p>
                We use essential cookies to maintain your session and provide core functionality. We do not use 
                third-party tracking cookies for advertising purposes. You can disable cookies in your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
              <p>
                Our services are not directed to individuals under 18. We do not knowingly collect data from minors. 
                If we become aware of such data, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Data Breach Notification</h2>
              <p>
                In the unlikely event of a data breach affecting your personal information, we will notify you and 
                relevant authorities within 72 hours as required by NDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Updates to This Policy</h2>
              <p>
                We may update this privacy policy to reflect changes in our practices or legal requirements. 
                Significant changes will be communicated via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact & Data Protection Officer</h2>
              <p>
                For privacy concerns or to exercise your rights:<br/><br/>
                <strong>Data Protection Officer (DPO)</strong><br/>
                Email: dpo@fixbudi.com<br/>
                Phone: +234 XXX XXX XXXX<br/>
                Address: [Company Address], Nigeria
              </p>
              <p className="mt-4">
                You also have the right to lodge a complaint with the Nigeria Data Protection Bureau (NDPB) 
                if you believe your data protection rights have been violated.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
