import { Link } from "react-router";
import { Video, Activity, MapPin, FileText, Droplets, Thermometer, Heart, ShieldCheck, ChevronRight } from "lucide-react";

export function Home() {
  const features = [
    {
      title: "Tele-Consultation",
      description: "Access remote medical professionals for audio/video consultation.",
      path: "/talk-to-doctor",
      icon: Video
    },
    {
      title: "Symptom Triage",
      description: "AI-assisted triage and preliminary health guidance.",
      path: "/check-symptoms",
      icon: Activity
    },
    {
      title: "Pharmacy Locator",
      description: "Directory of authorized pharmaceutical dispensers.",
      path: "/find-medicines",
      icon: MapPin
    },
    {
      title: "E-Health Records",
      description: "Centralized repository for patient medical documents.",
      path: "/health-records",
      icon: FileText
    },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Official Government style warning banner */}
      <div className="bg-[#e6f2ff] border border-blue-200 px-4 py-3 flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[#0056b3] shrink-0" />
        <div className="text-sm text-slate-800">
          <span className="font-bold">Official Portal of RuralTriage AI:</span> Providing accessible, standardized healthcare triage for rural blocks. All records are securely maintained under local health data policies.
        </div>
      </div>

      <div className="border border-slate-300 bg-white">
        {/* Header Block */}
        <div className="p-6 md:p-10 border-b border-slate-300 bg-slate-50">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 uppercase tracking-tight">
            Healthcare Access
          </h1>
          <p className="text-lg text-slate-700 max-w-3xl leading-relaxed mb-6">
            Consult registered practitioners online, perform initial triage, locate essential medicines, and manage authorized health records securely.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/talk-to-doctor"
              className="px-6 py-3 bg-[#0056b3] text-white font-bold text-sm uppercase tracking-wide hover:bg-blue-800 transition-none"
            >
              Start Consultation
            </Link>
            <Link
              to="/check-symptoms"
              className="px-6 py-3 bg-white text-[#0056b3] border border-[#0056b3] font-bold text-sm uppercase tracking-wide hover:bg-[#e6f2ff] transition-none"
            >
              Triage Symptoms
            </Link>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
          {features.map((feature, idx) => (
            <Link
              key={idx}
              to={feature.path}
              className={`p-6 md:p-8 flex items-start gap-4 hover:bg-slate-50 transition-none group ${idx > 1 ? 'border-t border-slate-300' : ''}`}
            >
              <div className="p-3 bg-[#e6f2ff] border border-blue-200 shrink-0">
                <feature.icon className="w-8 h-8 text-[#0056b3]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                  {feature.title}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0056b3] transition-none" />
                </h3>
                <p className="text-slate-600 text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Advisory Section */}
      <div className="border border-slate-300 bg-white">
        <div className="p-4 sm:p-6 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
            Public Health Advisories
          </h2>
          <Link to="/health-tips" className="text-sm font-bold text-[#0056b3] hover:underline uppercase tracking-wide">
            View All Directives →
          </Link>
        </div>
        
        <div className="divide-y divide-slate-300">
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50">
             <div className="mt-1"><Droplets className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">Safe Drinking Water Directive</h4>
               <p className="text-slate-700 mt-1">Ensure water is boiled before consumption to mitigate prevalent seasonal water-borne diseases.</p>
             </div>
           </div>
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50">
             <div className="mt-1"><Heart className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">Sanitation Protocol</h4>
               <p className="text-slate-700 mt-1">Standardize frequent hand-washing practices using soap to prevent community transmission.</p>
             </div>
           </div>
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50">
             <div className="mt-1"><Thermometer className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">Fever Monitoring</h4>
               <p className="text-slate-700 mt-1">Any sustained elevated temperatures must be reported via the Talk to Doctor portal immediately.</p>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}
