import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  MapPin, 
  Mail, 
  Settings, 
  Smartphone, 
  Clock, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Wrench,
  Zap,
  Target,
  Users,
  Cog,
  Calendar,
  TrendingUp,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <Wrench className="h-12 w-12 text-primary mr-4" />
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                🛠️ MVP Specification
              </h1>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-4">
              AI Diagnostic Agent for Appliance Repair
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              A comprehensive technical specification for building an AI-powered diagnostic agent 
              that enables remote appliance troubleshooting and seamless repair scheduling.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12 space-y-12">
        {/* Project Overview */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Target className="h-6 w-6 mr-3 text-primary" />
              1. Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-lg">
              We are a household appliance repair service specializing in <strong>TVs and common home electronics</strong>. 
              We aim to build a <strong>Minimum Viable Product (MVP)</strong> that allows users to 
              <strong> diagnose appliance issues from home</strong> using an <strong>AI-powered agent</strong>, 
              and if needed, <strong>schedule a pickup</strong> to our nearest repair center.
            </p>
          </CardContent>
        </Card>

        {/* MVP Objectives */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <CheckCircle className="h-6 w-6 mr-3 text-success" />
              2. MVP Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                Enable users to <strong>self-diagnose</strong> appliance issues.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                Reduce unnecessary physical visits by filtering out software issues.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                If hardware-related, <strong>suggest the nearest repair center</strong>.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                Allow users to <strong>submit a pickup request</strong>.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                Automatically <strong>notify the office</strong> via email with pickup details.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Target Users */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="h-6 w-6 mr-3 text-primary" />
              3. Target Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <h4 className="font-semibold mb-2">Homeowners</h4>
                <p className="text-sm text-muted-foreground">With malfunctioning TVs or home appliances</p>
              </div>
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <h4 className="font-semibold mb-2">Quick Diagnostics</h4>
                <p className="text-sm text-muted-foreground">Users seeking fast, no-contact diagnostics</p>
              </div>
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <h4 className="font-semibold mb-2">Digital-First</h4>
                <p className="text-sm text-muted-foreground">Customers who prefer digital interaction before service</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Features */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Cog className="h-6 w-6 mr-3 text-primary" />
              4. Core Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Bot className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">AI Diagnostic Agent</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Ask users guided questions to determine the issue. Text-based with optional voice input.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Rule-based decision tree</Badge>
                  <Badge variant="outline">Upgradeable to ML</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Zap className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Smart Routing</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Route users based on diagnosis: software issues get troubleshooting, hardware issues get repair options.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Software troubleshooting</Badge>
                  <Badge variant="outline">Hardware repair routing</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <MapPin className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Repair Center Locator</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Find nearest repair center based on location with contact details and map integration.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">GPS Location</Badge>
                  <Badge variant="outline">Maps Integration</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Mail className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Pickup Request & Email</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Collect user details and automatically notify the office via email with all pickup information.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Automated emails</Badge>
                  <Badge variant="outline">Customer confirmation</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Flow */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <ArrowRight className="h-6 w-6 mr-3 text-primary" />
              6. User Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                "User lands on the website/app",
                "Selects appliance type (e.g., TV)",
                "AI agent asks diagnostic questions",
                "AI determines if the issue is software or hardware",
                "If hardware: Shows nearest repair center & offers pickup request",
                "Form submitted → email sent to office",
                "Office calls customer and dispatches driver"
              ].map((step, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Requirements */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Settings className="h-6 w-6 mr-3 text-primary" />
              7. Technical Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-card rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-primary" />
                    Frontend (Website)
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• React.js or Vue.js</li>
                    <li>• Responsive design</li>
                    <li>• Mobile and desktop support</li>
                  </ul>
                </div>
                <div className="p-4 bg-gradient-card rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-primary" />
                    AI Agent
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Dialogflow or Rasa</li>
                    <li>• Custom rule-based logic</li>
                    <li>• Embedded chat widget</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-card rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-primary" />
                    Email Automation
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Nodemailer</li>
                    <li>• SendGrid</li>
                    <li>• Zapier integration</li>
                  </ul>
                </div>
                <div className="p-4 bg-gradient-card rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Smartphone className="h-5 w-5 mr-2 text-primary" />
                    Hosting
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Vercel or Netlify</li>
                    <li>• AWS</li>
                    <li>• Firebase (backend)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliverables Table */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <CheckCircle className="h-6 w-6 mr-3 text-success" />
              8. Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Deliverable</th>
                    <th className="text-left p-4 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Website", "Fully functional, mobile-responsive"],
                    ["AI Diagnostic Agent", "Integrated chatbot for appliance diagnosis"],
                    ["Repair Center Locator", "Displays nearest center based on location"],
                    ["Pickup Request Form", "Collects user info and sends to office email"],
                    ["Email Automation", "Form data sent to front desk email"]
                  ].map(([deliverable, description], index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">{deliverable}</td>
                      <td className="p-4 text-muted-foreground">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <TrendingUp className="h-6 w-6 mr-3 text-success" />
              9. Success Metrics (MVP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "Users can complete the diagnostic process in under 3 minutes",
                "80%+ of users find the diagnosis helpful",
                "100% of pickup requests are successfully sent to the office email",
                "Zero errors in form submission or email delivery"
              ].map((metric, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-muted-foreground">{metric}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Calendar className="h-6 w-6 mr-3 text-primary" />
              11. Estimated Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                ["Planning & Design", "1–2 weeks"],
                ["AI Agent Development", "2–3 weeks"],
                ["Website Development", "2–3 weeks"],
                ["Integration & Testing", "1 week"],
                ["Launch & Feedback", "1 week"],
                ["Total", "7–10 weeks"]
              ].map(([phase, duration], index) => (
                <div key={index} className={`flex justify-between items-center p-4 rounded-lg border ${
                  phase === "Total" ? "bg-primary/10 border-primary" : "bg-gradient-card"
                }`}>
                  <span className={`font-medium ${phase === "Total" ? "text-primary" : ""}`}>
                    {phase}
                  </span>
                  <Badge variant={phase === "Total" ? "default" : "outline"}>
                    {duration}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Estimate */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <DollarSign className="h-6 w-6 mr-3 text-primary" />
              12. Budget Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                ["AI Agent", "$1,000 – $2,500"],
                ["Website", "$2,000 – $4,000"],
                ["Email & Form Integration", "$500 – $1,000"],
                ["Total", "$3,500 – $7,500"]
              ].map(([component, cost], index) => (
                <div key={index} className={`flex justify-between items-center p-4 rounded-lg border ${
                  component === "Total" ? "bg-success/10 border-success" : "bg-gradient-card"
                }`}>
                  <span className={`font-medium ${component === "Total" ? "text-success" : ""}`}>
                    {component}
                  </span>
                  <Badge variant={component === "Total" ? "default" : "outline"}>
                    {cost}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="shadow-strong animate-fade-in bg-gradient-primary">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-primary-foreground">
              <CheckCircle className="h-6 w-6 mr-3" />
              ✅ Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-primary-foreground/90 mb-4">
              This MVP will allow your business to:
            </p>
            <ul className="space-y-2 text-primary-foreground/90">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                Offer <strong>instant diagnostics</strong> to customers
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                Improve <strong>first-contact resolution</strong>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                Reduce <strong>unnecessary visits</strong>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                Automate <strong>pickup scheduling</strong> and <strong>office workflow</strong>
              </li>
            </ul>
            <Separator className="my-6 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-primary-foreground/90 mb-4">
                Would you like this formatted as a <strong>PDF</strong>, <strong>pitch deck</strong>, or <strong>technical spec document</strong> for developers?
              </p>
              <Button variant="secondary" size="lg" className="animate-float">
                Get Started with Development
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
