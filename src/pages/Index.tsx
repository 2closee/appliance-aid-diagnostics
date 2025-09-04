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
  Globe,
  LogIn,
  LogOut,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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
                Fixbudi
              </h1>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-4">
              Smart Appliance Diagnosis & Repair Solutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Experience the future of appliance repair with our AI-powered diagnostic platform. 
              Get instant troubleshooting, connect with verified repair centers, and schedule convenient pickup services.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/diagnostic')} className="animate-float">
                Start Diagnosis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/repair-centers')}>
                Find Repair Centers
                <MapPin className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/apply-repair-center')}>
                Join as Repair Center
                <Settings className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12 space-y-12">
        {/* About Meranos Fixgadget */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Target className="h-6 w-6 mr-3 text-primary" />
              About Fixbudi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-lg">
              Since 2014, <strong>Fixbudi</strong> has been a state-of-the-art device repair, service, and sales chain 
              specializing in <strong>consumer electronics and household appliances</strong>. Based in Port Harcourt, Rivers State, 
              we offer comprehensive after-sales technical support with our motto <em>"...no excuses!"</em>
            </p>
            <p className="text-muted-foreground text-lg">
              Our expertise spans <strong>AC repairs, TV diagnostics, and various home electronics</strong>. 
              With this innovative AI-powered platform, we're revolutionizing how customers access our services, 
              making appliance diagnosis and repair more accessible than ever before.
            </p>
          </CardContent>
        </Card>

        {/* How Our Platform Works */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <CheckCircle className="h-6 w-6 mr-3 text-success" />
              How Our Platform Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <strong>Instant AI Diagnosis:</strong> Get immediate troubleshooting for your appliances through our intelligent diagnostic system.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <strong>Smart Problem Filtering:</strong> Our AI determines if issues can be resolved remotely or require professional intervention.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <strong>Verified Repair Centers:</strong> Connect with our network of certified technicians and authorized service centers.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <strong>Convenient Pickup Service:</strong> Schedule hassle-free device pickup and delivery directly from your location.
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <strong>Seamless Communication:</strong> Stay updated throughout the entire repair process with automated notifications.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Why Choose Meranos Fixgadget */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="h-6 w-6 mr-3 text-primary" />
              Why Choose Fixbudi?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">10+ Years Experience</h4>
                <p className="text-sm text-muted-foreground">Trusted repair services since 2014 with proven expertise</p>
              </div>
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Verified Technicians</h4>
                <p className="text-sm text-muted-foreground">Only certified professionals handle your valuable devices</p>
              </div>
              <div className="text-center p-4 bg-gradient-card rounded-lg">
                <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">AI-Powered Diagnosis</h4>
                <p className="text-sm text-muted-foreground">Instant, accurate problem identification saves time and money</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Services */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Cog className="h-6 w-6 mr-3 text-primary" />
              Our Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Bot className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">AI Diagnostic Assistant</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Our intelligent system asks targeted questions to identify your appliance issues quickly and accurately.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Instant Analysis</Badge>
                  <Badge variant="outline">24/7 Available</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Zap className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Expert Repair Services</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Professional repair for AC units, TVs, home electronics, and consumer appliances by certified technicians.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">AC Repairs</Badge>
                  <Badge variant="outline">TV & Electronics</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <MapPin className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Verified Service Centers</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Access our network of authorized repair centers across Nigeria with real-time availability and ratings.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Certified Partners</Badge>
                  <Badge variant="outline">Quality Assured</Badge>
                </div>
              </div>

              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Mail className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Convenient Pickup & Delivery</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Schedule device pickup from your location with real-time tracking and guaranteed safe handling.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Door-to-Door Service</Badge>
                  <Badge variant="outline">Insured Transport</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Section */}
        <Card className="shadow-medium animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Shield className="h-6 w-6 mr-3 text-primary" />
              Account & Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {user ? (
                <div className="p-6 bg-gradient-card rounded-lg border">
                  <div className="flex items-center mb-4">
                    <LogOut className="h-8 w-8 text-primary mr-3" />
                    <h3 className="text-xl font-semibold">Welcome back!</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    You are signed in as: {user.email}
                  </p>
                  <div className="space-y-2">
                    <Button onClick={handleSignOut} variant="outline" className="w-full">
                      Sign Out
                    </Button>
                    {isAdmin && (
                      <Button onClick={() => navigate('/admin')} className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gradient-card rounded-lg border">
                  <div className="flex items-center mb-4">
                    <LogIn className="h-8 w-8 text-primary mr-3" />
                    <h3 className="text-xl font-semibold">Sign In</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Access your account or create a new one to manage your repair requests.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Sign In / Sign Up
                  </Button>
                </div>
              )}
              
              <div className="p-6 bg-gradient-card rounded-lg border">
                <div className="flex items-center mb-4">
                  <Settings className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Admin Features</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Manage repair centers, view analytics, and configure global settings.
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Repair Center Management</Badge>
                  <Badge variant="outline">Global Settings</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Index;
