import { Link } from "react-router";
import { Video, Activity, MapPin, FileText, Droplets, Thermometer, Heart, ShieldCheck, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

export function Home() {
  const { t } = useLanguage();
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

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, 
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Official Government style warning banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#e6f2ff] border border-blue-200 px-4 py-3 flex items-start sm:items-center gap-3"
      >
        <ShieldCheck className="w-6 h-6 text-[#0056b3] shrink-0" />
        <div className="text-sm text-slate-800">
          <span className="font-bold">{t("Official Portal of RuralTriage AI:")}</span> {t("Providing accessible, standardized healthcare triage for rural blocks. All records are securely maintained under local health data policies.")}
        </div>
      </motion.div>

      <div className="border border-slate-300 bg-white">
        {/* Header Block */}
        <div className="border-b border-slate-300 bg-slate-50 relative overflow-hidden flex flex-col md:flex-row">
          <motion.div 
            initial="hidden"
            animate="visible"
            className="p-6 md:p-12 z-10 relative flex-1"
          >
            <motion.div custom={0} variants={fadeIn} className="inline-block px-3 py-1 bg-blue-100 text-[#0056b3] text-[10px] font-black uppercase tracking-[0.2em] mb-4">{t("Patient Portal")}</motion.div>
            <motion.h1 custom={1} variants={fadeIn} className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter leading-none">
              {t("Healthcare Access")}
            </motion.h1>
            <motion.p custom={2} variants={fadeIn} className="text-sm md:text-base font-bold text-slate-500 max-w-xl leading-relaxed mb-8 uppercase tracking-wide">
              {t("Consult registered practitioners online, perform initial triage, locate essential medicines, and manage authorized health records securely.")}
            </motion.p>
            <motion.div custom={3} variants={fadeIn} className="flex flex-wrap gap-4">
              <Link
                to="/talk-to-doctor"
                className="px-8 py-4 bg-[#0056b3] text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:bg-blue-800 transition-all hover:-translate-y-1"
              >
                {t("Start Consultation")}
              </Link>
              <Link
                to="/check-symptoms"
                className="px-8 py-4 bg-white text-[#0056b3] border border-slate-200 shadow-sm font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all hover:-translate-y-1"
              >
                {t("Triage Symptoms")}
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
             initial={{ opacity: 0, x: 50, scale: 1.1 }}
             animate={{ opacity: 0.9, x: 0, scale: 1.05 }}
             transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
             className="hidden md:block absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none"
             style={{ maskImage: 'linear-gradient(to right, transparent, black 15%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%)' }}
          >
             <img src="/dashboard_art.png" alt="Medical Illustration" className="w-full h-full object-cover object-center" />
          </motion.div>
        </div>

        {/* Directory Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
              }}
            >
              <Link
                to={feature.path}
                className={`group p-6 md:p-8 flex items-start gap-4 hover:bg-[#f8fafc] transition-all duration-300 relative overflow-hidden ${idx > 1 ? 'border-t border-slate-300' : ''}`}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-[#0056b3] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-3 bg-[#e6f2ff] border border-blue-200 shrink-0 group-hover:scale-110 group-hover:bg-[#0056b3] group-hover:border-[#0056b3] transition-all duration-500">
                  <feature.icon className="w-8 h-8 text-[#0056b3] group-hover:text-white transition-colors duration-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2 group-hover:text-[#0056b3] transition-colors">
                    {t(feature.title)}
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0056b3] group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    {t(feature.description)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Advisory Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="border border-slate-300 bg-white"
      >
        <div className="p-4 sm:p-6 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
            {t("Public Health Advisories")}
          </h2>
          <Link to="/health-tips" className="text-sm font-bold text-[#0056b3] hover:underline uppercase tracking-wide">
            {t("View All Directives")} →
          </Link>
        </div>
        
        <div className="divide-y divide-slate-300">
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50 transition-colors">
             <div className="mt-1"><Droplets className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">{t("Safe Drinking Water Directive")}</h4>
               <p className="text-slate-700 mt-1">{t("Ensure water is boiled before consumption to mitigate prevalent seasonal water-borne diseases.")}</p>
             </div>
           </div>
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50 transition-colors">
             <div className="mt-1"><Heart className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">{t("Sanitation Protocol")}</h4>
               <p className="text-slate-700 mt-1">{t("Standardize frequent hand-washing practices using soap to prevent community transmission.")}</p>
             </div>
           </div>
           <div className="p-4 sm:p-6 flex gap-4 hover:bg-slate-50 transition-colors">
             <div className="mt-1"><Thermometer className="w-6 h-6 text-slate-600" /></div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">{t("Fever Monitoring")}</h4>
               <p className="text-slate-700 mt-1">{t("Any sustained elevated temperatures must be reported via the Talk to Doctor portal immediately.")}</p>
             </div>
           </div>
        </div>
      </motion.div>

    </div>
  );
}
