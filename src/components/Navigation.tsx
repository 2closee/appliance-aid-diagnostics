import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Bike,
  BookOpen,
  Bot,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Settings,
  Stethoscope,
  Sun,
  Target,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import logoLight from "@/assets/fixbudi-logo-light.webp";
import logoDark from "@/assets/fixbudi-logo-dark.webp";

type NavItem = { path: string; label: string; shortLabel?: string; icon: typeof Home };

const roleMenus: Record<string, NavItem[]> = {
  guest: [
    { path: "/", label: "Home", icon: Home },
    { path: "/diagnostic", label: "AI Diagnostic", shortLabel: "Diagnose", icon: Bot },
    { path: "/self-test", label: "Phone Self-Test", shortLabel: "Self-Test", icon: Stethoscope },
    { path: "/repair-centers", label: "Repair Centers", shortLabel: "Centers", icon: MapPin },
    { path: "/pickup-selection", label: "Schedule Pickup", shortLabel: "Pickup", icon: Mail },
    { path: "/ovapass", label: "Ride with Ovapass", shortLabel: "Ovapass", icon: Bike },
    { path: "/blog", label: "Blog", icon: BookOpen },
  ],
  customer: [
    { path: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: Home },
    { path: "/diagnostic", label: "AI Diagnostic", shortLabel: "Diagnose", icon: Bot },
    { path: "/repair-jobs", label: "My Repairs", shortLabel: "Repairs", icon: Wrench },
    { path: "/customer-conversations", label: "Conversations", shortLabel: "Chats", icon: MessageCircle },
    { path: "/self-test", label: "Phone Self-Test", icon: Stethoscope },
    { path: "/repair-centers", label: "Repair Centers", icon: MapPin },
    { path: "/pickup-selection", label: "Schedule Pickup", icon: Mail },
    { path: "/payment-history", label: "Payment History", icon: CreditCard },
    { path: "/ovapass", label: "Ride with Ovapass", icon: Bike },
    { path: "/blog", label: "Blog", icon: BookOpen },
    { path: "/notifications", label: "Notifications & Guide", icon: Bell },
  ],
  repair_center: [
    { path: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: Home },
    { path: "/repair-jobs", label: "Repair Jobs", shortLabel: "Jobs", icon: Wrench },
    { path: "/repair-center-conversations", label: "Conversations", shortLabel: "Chats", icon: MessageCircle },
    { path: "/center-earnings", label: "Earnings", icon: CreditCard },
    { path: "/repair-center-admin", label: "Center Settings", icon: Settings },
    { path: "/notifications", label: "Notifications & Guide", icon: Bell },
  ],
  rider: [
    { path: "/rider", label: "Rider Home", shortLabel: "Home", icon: Bike },
    { path: "/rider/earnings", label: "Earnings", icon: CreditCard },
    { path: "/notifications", label: "Notifications & Guide", shortLabel: "Alerts", icon: Bell },
    { path: "/contact-support", label: "Support", icon: Mail },
  ],
  admin: [
    { path: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
    { path: "/super-admin", label: "Super Admin", shortLabel: "Control", icon: Settings },
    { path: "/strategic-analytics", label: "Strategic Planning", shortLabel: "Insights", icon: Target },
    { path: "/payout-management", label: "Payout Management", shortLabel: "Payouts", icon: CreditCard },
    { path: "/notifications", label: "Notifications & Guide", icon: Bell },
  ],
};

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, userRole, isRepairCenterStaff, repairCenterId } = useAuth();
  const { theme, setTheme } = useTheme();
  const { totalUnread } = useConversationNotifications(
    isRepairCenterStaff ? repairCenterId : undefined,
    userRole === "customer" ? user?.id : undefined,
  );

  const navItems = !user ? roleMenus.guest : roleMenus[userRole ?? "customer"] ?? roleMenus.customer;
  const mobilePrimary = user ? navItems.slice(0, 4) : [];
  const mobileOverflow = user ? navItems.slice(4) : navItems;

  useEffect(() => setIsMenuOpen(false), [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(`${path}/`));

  const unreadBadge = (path: string) => {
    const isConversation = path === "/customer-conversations" || path === "/repair-center-conversations";
    if (!isConversation || totalUnread === 0) return null;
    return (
      <Badge variant="destructive" className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]">
        {totalUnread > 9 ? "9+" : totalUnread}
      </Badge>
    );
  };

  return (
    <>
      <nav className="native-top-bar fixed inset-x-0 top-0 z-50 border-b bg-background/95 pt-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/85">
        <div className="container mx-auto flex h-16 items-center justify-between px-safe-x">
          <Link to={user ? (userRole === "rider" ? "/rider" : "/dashboard") : "/"} className="absolute left-1/2 flex min-w-0 shrink-0 -translate-x-1/2 items-center lg:static lg:translate-x-0">
            <img src={theme === "dark" ? logoDark : logoLight} alt="Fixbudi" className="h-8 w-auto" />
          </Link>

          <div className="hidden min-w-0 items-center gap-1 lg:flex">
            {navItems.slice(0, 6).map((item) => (
              <Button key={item.path} asChild variant={isActive(item.path) ? "default" : "ghost"} className="px-3">
                <Link to={item.path}><item.icon className="h-4 w-4" /><span>{item.shortLabel ?? item.label}</span></Link>
              </Button>
            ))}
            {navItems.length > 6 && (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild><Button variant="ghost"><Menu className="h-4 w-4" />More</Button></SheetTrigger>
                <SheetContent className="w-full max-w-sm"><NavSheet items={navItems.slice(6)} isActive={isActive} theme={theme} setTheme={setTheme} signOut={user ? signOut : undefined} /></SheetContent>
              </Sheet>
            )}
            {!user && <Button asChild variant="outline"><Link to="/auth">Sign In</Link></Button>}
            {user && <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut /></Button>}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            {user && (
              <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Link to="/notifications"><Bell className="h-5 w-5" /></Link>
              </Button>
            )}
            {!user && <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>}
            {!user && (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-lg pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                  <NavSheet items={mobileOverflow} isActive={isActive} theme={theme} setTheme={setTheme} />
                  <Button asChild className="mt-4 w-full"><Link to="/auth">Sign in to FixBudi</Link></Button>
                  <Button asChild variant="outline" className="mt-2 w-full"><Link to="/partner-login">Repair center portal</Link></Button>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </nav>

      {user && (
        <nav className="native-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
          <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 px-1">
            {mobilePrimary.map((item) => (
              <Link key={item.path} to={item.path} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95 ${isActive(item.path) ? "text-foreground" : "text-muted-foreground"}`}>
                <span className={`flex h-7 min-w-10 items-center justify-center rounded-full px-3 ${isActive(item.path) ? "bg-primary text-primary-foreground" : ""}`}><item.icon className="h-[18px] w-[18px]" /></span>
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
                {unreadBadge(item.path)}
              </Link>
            ))}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-full min-w-0 flex-col gap-1 rounded-none px-1 text-[11px] text-muted-foreground shadow-none hover:scale-100">
                  <span className="flex h-7 min-w-10 items-center justify-center rounded-full px-3"><Menu className="h-[18px] w-[18px]" /></span>
                  <span>More</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-lg pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                <NavSheet items={mobileOverflow} isActive={isActive} theme={theme} setTheme={setTheme} signOut={signOut} />
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      )}
    </>
  );
};

const NavSheet = ({ items, isActive, theme, setTheme, signOut }: {
  items: NavItem[];
  isActive: (path: string) => boolean;
  theme?: string;
  setTheme: (theme: string) => void;
  signOut?: () => Promise<void>;
}) => (
  <>
    <SheetHeader className="mb-5 text-left">
      <SheetTitle>More</SheetTitle>
      <SheetDescription>Everything you need, in one place.</SheetDescription>
    </SheetHeader>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <SheetClose asChild key={item.path}>
          <Link to={item.path} className={`flex min-h-20 flex-col justify-between rounded-lg border p-3 text-sm font-medium transition-colors ${isActive(item.path) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}>
            <item.icon className="h-5 w-5" /><span>{item.label}</span>
          </Link>
        </SheetClose>
      ))}
    </div>
    <div className="mt-5 flex items-center justify-between border-t pt-4">
      <div className="flex items-center gap-2 text-sm font-medium"><Sun className="h-4 w-4" />Appearance<Moon className="h-4 w-4" /></div>
      <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Use dark theme" />
    </div>
    {signOut && <Button variant="outline" className="mt-4 w-full" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>}
  </>
);

export default Navigation;