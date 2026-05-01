import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import { SelfTestRunner } from "@/components/selftest/SelfTestRunner";

const SelfTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Free Phone Self-Diagnostic | FixBudi</title>
        <meta
          name="description"
          content="Run a free in-browser self-diagnostic on your Android or iPhone. Test battery, screen, touch, cameras, microphone, speakers and vibration in 3 minutes."
        />
        <meta property="og:title" content="Free Phone Self-Diagnostic | FixBudi" />
        <meta property="og:description" content="Scan your phone for issues in 3 minutes — right from your browser." />
      </Helmet>
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <header className="mb-6 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Phone Self-Diagnostic</h1>
          <p className="text-muted-foreground">
            Scan your device for the most common hardware issues — battery, screen, touch, cameras, microphone, speakers and vibration. No app install needed.
          </p>
        </header>
        <SelfTestRunner />
      </main>
    </div>
  );
};

export default SelfTest;
