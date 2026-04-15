import { Link, Outlet, useLocation } from "react-router";
import { LogIn, Menu, X, User, Home, Activity, FileText, BriefcaseMedical, Stethoscope, ClipboardList, Calendar, Pill } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import SwasthyaAuth from "./SwasthyaAuth";
import UserProfile from "./UserProfile";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "?";

  const patientNavItems = [
    { name: "Dashboard", path: "/", icon: <Home className="w-5 h-5" /> },
    { name: "Talk to Doctor", path: "/talk-to-doctor", icon: <User className="w-5 h-5" /> },
    { name: "Check Symptoms", path: "/check-symptoms", icon: <Activity className="w-5 h-5" /> },
    { name: "Find Medicines", path: "/find-medicines", icon: <BriefcaseMedical className="w-5 h-5" /> },
    { name: "Health Records", path: "/health-records", icon: <FileText className="w-5 h-5" /> },
  ];

  const doctorNavItems = [
    { name: "Clinical Dashboard", path: "/dashboard/doctor", icon: <Stethoscope className="w-5 h-5" /> },
    { name: "Appointments", path: "/dashboard/doctor#appointments", icon: <Calendar className="w-5 h-5" /> },
    { name: "Patient Queue", path: "/dashboard/doctor#queue", icon: <ClipboardList className="w-5 h-5" /> },
    { name: "Prescriptions", path: "/dashboard/doctor#prescriptions", icon: <Pill className="w-5 h-5" /> },
  ];

  const pharmacistNavItems = [
    { name: "Dispensary", path: "/dashboard/pharmacist/dispensary", icon: <Pill className="w-5 h-5" /> },
    { name: "Inventory", path: "/dashboard/pharmacist/inventory", icon: <ClipboardList className="w-5 h-5" /> },
  ];

  const navItems = user.role === "doctor"
    ? doctorNavItems
    : user.role === "pharmacy"
    ? pharmacistNavItems
    : patientNavItems;

  const isActive = (path: string) => {
    // If the path contains a hash, ensure both the base path and the hash match
    if (path.includes("#")) {
      const [base, hash] = path.split("#");
      return location.pathname === base && location.hash === `#${hash}`;
    }

    // For dashboard base paths, don't show active if a hash is present 
    // (so "Clinical Dashboard" doesn't light up when "Appointments" is active)
    if ((path === "/dashboard/doctor" || path === "/dashboard/pharmacist" || path === "/") && location.hash) {
      return false;
    }

    const base = path.split("#")[0];
    return location.pathname === base || (base !== "/" && location.pathname.startsWith(base));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans text-slate-900 selection:bg-[#e6f2ff]">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-300 bg-white z-50 sticky top-0">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">RuralTriage AI</span>
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 border border-slate-300 rounded-sm">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${mobileMenuOpen ? "block" : "hidden"} lg:flex flex-col w-full lg:w-64 border-r border-slate-300 bg-white h-screen sticky top-0 z-40 overflow-y-auto`}> 
        <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-b border-slate-300">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
          <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">RuralTriage AI</span>
        </div>

        <div className="p-4 flex-1 space-y-2 mt-4">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-colors ${
                  active ? "bg-[#e6f2ff] border-l-4 border-[#0056b3] text-[#0056b3]" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User / Auth Area at bottom of sidebar */}
        <div className="p-6 border-t border-slate-300 bg-slate-50">
          {isLoggedIn ? (
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-300 rounded-sm hover:bg-[#e6f2ff] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#0056b3] text-white rounded-sm font-bold text-sm">
                      {initials}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
                    </div>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6 bg-white border border-slate-300 rounded-sm shadow-none">
                <UserProfile onClose={() => setProfileOpen(false)} />
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0056b3] text-white rounded-sm font-bold hover:bg-blue-800 transition-colors">
                  <LogIn className="w-5 h-5" /> Login / Register
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 outline-none border-none bg-transparent shadow-none">
                <SwasthyaAuth onClose={() => setLoginOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-white min-h-screen pb-16">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
