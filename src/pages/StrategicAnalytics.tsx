import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Users, Building2, TrendingUp, MapPin, Activity, Target } from "lucide-react";
import StrategicMap from "@/components/analytics/StrategicMap";
import SignupTrendsChart from "@/components/analytics/SignupTrendsChart";
import GeographicDistribution from "@/components/analytics/GeographicDistribution";
import TrafficHeatIndicator from "@/components/analytics/TrafficHeatIndicator";
import SignupOverviewCards from "@/components/analytics/SignupOverviewCards";
import RecentSignupsTable from "@/components/analytics/RecentSignupsTable";

const StrategicAnalytics = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [dateRange, setDateRange] = useState<string>("30");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Strategic Planning Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analytics for user growth, repair center coverage, and market opportunities
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Cards */}
        <SignupOverviewCards dateRange={parseInt(dateRange)} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map View</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="traffic" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Traffic</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <StrategicMap dateRange={parseInt(dateRange)} />
              </div>
              <div className="space-y-4">
                <GeographicDistribution dateRange={parseInt(dateRange)} type="users" />
                <GeographicDistribution dateRange={parseInt(dateRange)} type="centers" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SignupTrendsChart dateRange={parseInt(dateRange)} type="users" />
              <SignupTrendsChart dateRange={parseInt(dateRange)} type="centers" />
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrafficHeatIndicator dateRange={parseInt(dateRange)} type="users" />
              <TrafficHeatIndicator dateRange={parseInt(dateRange)} type="centers" />
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecentSignupsTable dateRange={parseInt(dateRange)} type="users" />
              <RecentSignupsTable dateRange={parseInt(dateRange)} type="centers" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StrategicAnalytics;
