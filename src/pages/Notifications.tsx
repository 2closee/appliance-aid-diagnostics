import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";
import Navigation from "@/components/Navigation";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import { useAuth } from "@/hooks/useAuth";
import { TOURS, startTour, tourKeyForRole } from "@/components/tour/tours";

const Notifications = () => {
  const { user, userRole, isLoading } = useAuth();

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const tour = TOURS[tourKeyForRole(userRole)];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-2xl px-4 pt-24 pb-12 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Notifications &amp; guide</h1>
          <p className="text-muted-foreground">
            Choose how Fixbudi reaches you, and replay the walkthrough any time.
          </p>
        </header>

        <NotificationSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              App walkthrough
            </CardTitle>
            <CardDescription>{tour.label} — {tour.steps.length} short steps.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startTour}>Replay the walkthrough</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Notifications;
