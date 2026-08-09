import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MapPin, 
  Mail, 
  Home,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Settings,
  MessageCircle,
  CreditCard,
  Target,
  Stethoscope,
  Bike
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";
import logoLight from "@/assets/fixbudi-logo-light.webp";
import logoDark from "@/assets/fixbudi-logo-dark.webp";

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, userRole, isRepairCenterStaff, repairCenterId } = useAuth();
  const { theme, setTheme } = useTheme();
  const { totalUnread } = useConversationNotifications(
    isRepairCenterStaff ? repairCenterId : undefined,
    userRole === 'customer' ? user?.id : undefined
  );

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    ...(user ? [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    // Only show customer features for actual customers and logged-out users (not repair center staff)
    ...(userRole === 'customer' || (!user && !isRepairCenterStaff) ? [
      { path: "/diagnostic", label: "AI Diagnostic", icon: Bot },
      { path: "/self-test", label: "Self-Test", icon: Stethoscope },
      { path: "/repair-centers", label: "Repair Centers", icon: MapPin },
      { path: "/pickup-selection", label: "Schedule Pickup", icon: Mail },
      { path: "/ovapass", label: "Ride with Ovapass", icon: Bike },
    ] : []),
    // Show payment history for customers
    ...(userRole === 'customer' ? [
      { path: "/payment-history", label: "Payment History", icon: CreditCard },
    ] : []),
    // Super Admin specific navigation
    ...(userRole === 'admin' ? [
      { path: "/super-admin", label: "Super Admin", icon: Settings },
      { path: "/strategic-analytics", label: "Strategic Planning", icon: Target },
      { path: "/payout-management", label: "Payout Management", icon: CreditCard },
    ] : []),
  ];

  const primaryPaths = ["/", "/dashboard", "/diagnostic", "/repair-centers", "/pickup-selection", "/ovapass"];
  const primaryItems = navItems.filter((item) => primaryPaths.includes(item.path));
  const overflowItems = navItems.filter((item) => !primaryPaths.includes(item.path));

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-safe">
      <div className="container mx-auto px-safe-x">
        <div className="flex items-center justify-between h-16 gap-2">
          <Link to="/" className="flex shrink-0 items-center space-x-2 group">
            <img 
              src={theme === 'dark' ? logoDark : logoLight}
              alt="Fixbudi" 
              className="h-8 w-auto group-hover:scale-105 transition-all duration-500 ease-in-out"
            />
          </Link>

          {/* Dark Mode Toggle - Mobile & Tablet */}
          <div className="flex items-center space-x-3 lg:hidden">
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="data-[state=checked]:bg-primary"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-w-0 lg:flex items-center gap-0.5 xl:gap-1">
            {primaryItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={index >= 4 ? "hidden xl:block" : undefined}
              >
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="flex items-center gap-2 px-2.5 xl:px-3 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}

            {/* Overflow menu */}
            {(overflowItems.length > 0 || primaryItems.length > 4) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-1 px-2.5 whitespace-nowrap ${overflowItems.length === 0 ? "xl:hidden" : ""}`}
                  >
                    <span>More</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  {primaryItems.slice(4).map((item) => (
                    <DropdownMenuItem key={item.path} asChild className="xl:hidden">
                      <Link to={item.path} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {overflowItems.map((item) => (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link to={item.path} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            
            {/* Conversations Icon */}
            {user && (userRole === 'customer' || isRepairCenterStaff) && (
              <Link to={userRole === 'customer' ? "/customer-conversations" : "/repair-center-conversations"}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <MessageCircle className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            {/* Only show Repair Center Portal link to non-logged-in users */}
            {!user && (
              <Link to="/repair-center-admin" className="shrink-0">
                <Button variant="secondary" className="flex items-center gap-2 px-2.5 xl:px-3 whitespace-nowrap">
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="hidden xl:inline">Repair Center Portal</span>
                  <span className="xl:hidden">Portal</span>
                </Button>
              </Link>
            )}
            {user ? (
              <Button
                variant="ghost"
                onClick={signOut}
                className="flex shrink-0 items-center gap-2 px-2.5 whitespace-nowrap"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth" className="shrink-0">
                <Button variant="outline" className="whitespace-nowrap">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
            
            {/* Conversations Link for Mobile */}
            {user && (userRole === 'customer' || isRepairCenterStaff) && (
              <Link 
                to={userRole === 'customer' ? "/customer-conversations" : "/repair-center-conversations"}
                onClick={() => setIsMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Conversations</span>
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            {!user && (
              <Link to="/repair-center-admin" onClick={() => setIsMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-start flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Repair Center Portal</span>
                </Button>
              </Link>
            )}
            {user ? (
              <Button
                variant="ghost"
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="w-full justify-start flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;