import { Link } from "react-router";
import { Mail, Phone, MapPin, ShieldCheck, ExternalLink } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#0f2a44] text-white pt-12 pb-6 border-t border-slate-700">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-10">
        
        {/* Section A: Brand Info */}
        <div className="space-y-4 text-center md:text-left">
          <Link to="/" className="flex items-center justify-center md:justify-start gap-2">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto border border-slate-700 p-1 bg-white rounded-sm" />
            <span className="text-xl font-bold tracking-tight text-white">RuralTriage AI</span>
          </Link>
          <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-xs mx-auto md:mx-0">
            Empowering rural communities with AI-driven diagnostic triage and seamless telemedicine access.
          </p>
        </div>

        {/* Section B: Quick Links */}
        <div className="space-y-4 text-center">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00aaff]">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
            <Link to="/" className="hover:text-[#00aaff] transition-colors">Dashboard</Link>
            <Link to="/talk-to-doctor" className="hover:text-[#00aaff] transition-colors">Talk to Doctor</Link>
            <Link to="/check-symptoms" className="hover:text-[#00aaff] transition-colors">Check Symptoms</Link>
            <Link to="/find-medicines" className="hover:text-[#00aaff] transition-colors">Find Medicines</Link>
            <Link to="/health-records" className="hover:text-[#00aaff] transition-colors">Health Records</Link>
            <Link to="/support" className="hover:text-[#00aaff] transition-colors flex items-center justify-center gap-1 group">
               Support <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-[#00aaff]" />
            </Link>
          </div>
        </div>

        {/* Section C: Contact & Info */}
        <div className="space-y-4 text-center md:text-right">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00aaff]">Contact Registry</h3>
          <div className="space-y-3 flex flex-col items-center md:items-end">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">support@ruraltriage.ai</span>
              <Mail className="w-4 h-4 text-[#00aaff]" />
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">+91-90000-00000</span>
              <Phone className="w-4 h-4 text-[#00aaff]" />
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">Maharashtra, India</span>
              <MapPin className="w-4 h-4 text-[#00aaff]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-6xl mx-auto px-6 border-t border-slate-800/50 pt-8 mt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            © {currentYear} RuralTriage AI • All Rights Reserved
          </p>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <ShieldCheck className="w-3 h-3 text-green-500/50" />
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">
              Official Medical Triage Deployment Portal
            </p>
          </div>
        </div>
        
        <div className="text-[10px] font-bold text-slate-500 space-x-4 uppercase tracking-[0.1em]">
          <span className="hover:text-white transition-colors cursor-pointer cursor-not-allowed opacity-40">Privacy Policy</span>
          <span className="hover:text-white transition-colors cursor-pointer cursor-not-allowed opacity-40">Terms of Service</span>
          <span className="text-[#00aaff]/60 px-3 py-1 bg-blue-900/30 rounded-full border border-blue-800/20">Educational Demo</span>
        </div>
      </div>
    </footer>
  );
}
