import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  MapPin, 
  Mail, 
  Home,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Wrench,
  Moon,
  Sun,
  Settings
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, userRole } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    ...(user ? [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    ...(userRole === 'customer' || !user ? [
      { path: "/diagnostic", label: "AI Diagnostic", icon: Bot },
      { path: "/repair-centers", label: "Repair Centers", icon: MapPin },
      { path: "/pickup-selection", label: "Schedule Pickup", icon: Mail },
    ] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary rounded-lg group-hover:scale-105 transition-transform">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">
                Fixbudi
              </span>
            </div>
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
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
            {!user && (
              <Link to="/repair-center-admin">
                <Button variant="secondary" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Repair Center</span>
                </Button>
              </Link>
            )}
            {user ? (
              <Button
                variant="ghost"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="outline">Sign In</Button>
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