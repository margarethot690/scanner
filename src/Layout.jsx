import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Box,
  Wallet,
  Receipt,
  Coins,
  Network,
  Server,
  Users,
  Clock,
  BarChart3,
  Menu,
  X,
  Activity,
  Globe,
  User,
  LogOut,
  Settings,
  Shield,
  ChevronDown,
  Languages,
  ArrowUpDown, // Added ArrowUpDown icon
} from "lucide-react";
import SearchBar from "./components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageProvider, useLanguage } from "./components/contexts/LanguageContext";

// New component for analytics tracking
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // This effect runs on initial mount and whenever location.pathname changes
    // In a real application, you would send this data to an analytics service
    // For example:
    // YourAnalyticsService.trackPageView(location.pathname);
    console.log(`Analytics: Page viewed - ${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  // This component doesn't render anything visually
  return null;
};

function LayoutContent({ children }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, changeLanguage, t } = useLanguage();

  const navigationItems = [
    { title: t("dashboard"), url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: t("blocks"), url: createPageUrl("Blocks"), icon: Box },
    { title: t("blockFeed"), url: createPageUrl("BlockFeed"), icon: Activity },
    { title: t("transactions"), url: createPageUrl("Transaction"), icon: Receipt },
    { title: t("dexPairs"), url: createPageUrl("DexPairs"), icon: ArrowUpDown },
    { title: t("unconfirmed"), url: createPageUrl("UnconfirmedTransactions"), icon: Clock },
    { title: t("address"), url: createPageUrl("Address"), icon: Wallet },
    { title: t("assets"), url: createPageUrl("Asset"), icon: Coins },
    { title: t("distribution"), url: createPageUrl("DistributionTool"), icon: Users },
    { title: t("transactionMap"), url: createPageUrl("TransactionMap"), icon: Network },
    { title: t("networkStats"), url: createPageUrl("NetworkStatistics"), icon: BarChart3 },
    { title: t("networkMap"), url: createPageUrl("NetworkMap"), icon: Globe },
    { title: t("peers"), url: createPageUrl("Peers"), icon: Network },
    { title: t("node"), url: createPageUrl("Node"), icon: Server },
  ];

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Analytics Tracker - invisible component that tracks page views */}
      <AnalyticsTracker />

      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-lg shadow-sm"
            : "bg-white/80 backdrop-blur-md"
        }`}
      >
        {/* Top Row - Logo, Search, and User/Auth */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to={createPageUrl("Dashboard")}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow overflow-hidden">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee04aadedc18acdde68252/fc4b1e741_DecentralScanLogo.png" 
                  alt="DecentralScan Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">
                  {t("appName")}
                </h1>
                <p className="text-xs text-gray-500">{t("appSubtitle")}</p>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 mx-8 max-w-2xl">
              <SearchBar />
            </div>

            {/* User Menu / Sign In Button, Language Switcher & Mobile Menu Button */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Languages className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('en')}
                    className={language === 'en' ? 'bg-blue-50' : ''}
                  >
                    🇺🇸 English
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('es')}
                    className={language === 'es' ? 'bg-blue-50' : ''}
                  >
                    🇪🇸 Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {userLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium">
                        {user.full_name}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {user.role === "admin" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Shield className="w-3 h-3" />
                            {t("administrator")}
                          </span>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("UserDashboard")} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t("myDashboard")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("UserProfile")} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        {t("profile")}
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("AdminPanel")} className="cursor-pointer">
                            <Shield className="w-4 h-4 mr-2" />
                            {t("adminPanel")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                              <Link to={createPageUrl("AdminAnalytics")} className="cursor-pointer">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analytics Dashboard
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("AdminNodeRegistrations")} className="cursor-pointer">
                                <Server className="w-4 h-4 mr-2" />
                                Node Registrations
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t("signIn")} / {t("signUp")}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <SearchBar />
          </div>
        </div>

        {/* Navigation Tabs Row - Desktop */}
        <div className="hidden lg:block border-t bg-white/50">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto py-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    location.pathname === item.url
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-4 grid grid-cols-2 gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.url
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Box className="w-4 h-4" />
              <span>{t("appName")} {t("appSubtitle")}</span>
            </div>
            <p className="text-sm text-gray-500">
              Powered by DecentralChain Public API
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <LayoutContent>{children}</LayoutContent>
    </LanguageProvider>
  );
}