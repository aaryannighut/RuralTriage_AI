import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const healthData = {
  score: 74,
  name: "Arjun Mehta",
  age: 42,
  lastUpdated: "Mar 12, 2026",
  interventions: {
    dos: [
      { id: 1, text: "Take Metformin 500mg with meals, twice daily", priority: "critical" },
      { id: 2, text: "Drink at least 2.5L of water daily", priority: "high" },
      { id: 3, text: "30 min brisk walk every morning", priority: "high" },
      { id: 4, text: "Monitor blood pressure every 48 hours", priority: "medium" },
    ],
    donts: [
      { id: 1, text: "Avoid refined sugar & white carbohydrates entirely", priority: "critical" },
      { id: 2, text: "Do not skip Atorvastatin — cholesterol levels are elevated", priority: "critical" },
      { id: 3, text: "No alcohol for the next 30 days", priority: "high" },
      { id: 4, text: "Avoid high-sodium processed foods", priority: "medium" },
    ],
  },
  labReports: [
    { id: 1, test: "HbA1c", value: "7.2%", status: "warning", date: "Feb 28, 2026", range: "Normal <5.7%" },
    { id: 2, test: "LDL Cholesterol", value: "142 mg/dL", status: "danger", date: "Feb 28, 2026", range: "Normal <100 mg/dL" },
    { id: 3, test: "Blood Pressure", value: "128/84 mmHg", status: "warning", date: "Mar 10, 2026", range: "Normal <120/80" },
    { id: 4, test: "Vitamin D", value: "18 ng/mL", status: "danger", date: "Feb 28, 2026", range: "Normal 30-100 ng/mL" },
    { id: 5, test: "Creatinine", value: "0.9 mg/dL", status: "normal", date: "Feb 28, 2026", range: "Normal 0.7-1.2 mg/dL" },
    { id: 6, test: "TSH", value: "2.1 mIU/L", status: "normal", date: "Feb 28, 2026", range: "Normal 0.4-4.0 mIU/L" },
  ],
  medicines: [
    { id: 1, name: "Metformin", dose: "500mg", frequency: "Twice daily", time: "Morning & Night", stock: 14, total: 30, category: "Diabetes" },
    { id: 2, name: "Atorvastatin", dose: "20mg", frequency: "Once daily", time: "Night", stock: 8, total: 30, category: "Cholesterol" },
    { id: 3, name: "Vitamin D3", dose: "60,000 IU", frequency: "Weekly", time: "Sunday morning", stock: 3, total: 8, category: "Supplement" },
    { id: 4, name: "Telmisartan", dose: "40mg", frequency: "Once daily", time: "Morning", stock: 22, total: 30, category: "Blood Pressure" },
  ],
  dailyMandate: [
    { id: 1, time: "6:30 AM", task: "Wake up & 10 min stretching", done: true },
    { id: 2, time: "7:00 AM", task: "Take Telmisartan 40mg", done: true },
    { id: 3, time: "8:00 AM", task: "Breakfast + Metformin 500mg", done: true },
    { id: 4, time: "8:30 AM", task: "30 min brisk walk", done: false },
    { id: 5, time: "1:00 PM", task: "Lunch — low carb meal", done: false },
    { id: 6, time: "2:00 PM", task: "Metformin 500mg", done: false },
    { id: 7, time: "6:00 PM", task: "Blood pressure check", done: false },
    { id: 8, time: "9:30 PM", task: "Atorvastatin 20mg + Vitamin D3", done: false },
    { id: 9, time: "10:30 PM", task: "Sleep — 7-8 hours required", done: false },
  ],
};

const statusConfig: Record<string, { bg: string; text: string; badge: string }> = {
  normal: { bg: "bg-[#e8f5e9]", text: "text-green-900", badge: "NORMAL" },
  warning: { bg: "bg-yellow-100", text: "text-yellow-900", badge: "MONITOR" },
  danger: { bg: "bg-red-100", text: "text-red-900", badge: "ELEVATED" },
};

const priorityConfig: Record<string, string> = {
  critical: "bg-red-100 text-red-900 border-red-300",
  high: "bg-yellow-100 text-yellow-900 border-yellow-300",
  medium: "bg-slate-100 text-slate-800 border-slate-300",
};

export function HealthDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dos");
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>(
    healthData.dailyMandate.reduce((acc, t) => ({ ...acc, [t.id]: t.done }), {} as Record<number, boolean>)
  );

  const toggleTask = (id: number) => setCheckedTasks((p) => ({ ...p, [id]: !p[id] }));
  const completedCount = Object.values(checkedTasks).filter(Boolean).length;

  return (
    <div className="w-full bg-white space-y-6 text-slate-900 font-sans">
      
      {/* Top Advisory */}
      <div className="bg-red-50 border border-red-200 px-4 py-3 flex gap-3 text-red-900">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <span className="text-sm">
          <strong className="uppercase">{t("Clinical Alert")}:</strong> {t("2 critical interventions require immediate compliance based on latest diagnostic reports.")}
        </span>
      </div>

      {/* Header */}
      <div className="border border-slate-300 bg-slate-50 flex items-center justify-between p-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">{t("Patient Dossier")}: {t(healthData.name)}</h1>
          <p className="text-sm font-semibold text-slate-600 uppercase mt-1">{t("Registry Data")} ({t("Age")}: {healthData.age}) | {t("Last Update")}: {t(healthData.lastUpdated)}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold uppercase text-slate-600 mb-1">{t("Index Score")}</div>
          <div className={`text-4xl font-bold ${healthData.score < 80 ? "text-yellow-600" : "text-green-600"}`}>
            {healthData.score}/100
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Urgent Interventions */}
        <div className="border border-slate-300">
          <div className="bg-slate-100 border-b border-slate-300 p-4 flex justify-between items-center">
            <h2 className="font-bold uppercase tracking-wide">{t("Mandatory Interventions")}</h2>
            <div className="flex border border-slate-300 bg-white text-xs font-bold uppercase">
              <button 
                onClick={() => setActiveTab("dos")}
                className={`px-4 py-2 ${activeTab === "dos" ? "bg-[#0056b3] text-white" : "hover:bg-slate-100"}`}
              >{t("Directives (Do's)")}</button>
              <button 
                onClick={() => setActiveTab("donts")}
                className={`px-4 py-2 border-l border-slate-300 ${activeTab === "donts" ? "bg-red-800 text-white" : "hover:bg-slate-100"}`}
              >{t("Prohibitions (Don'ts)")}</button>
            </div>
          </div>
          <div className="p-0">
             <table className="w-full text-left text-sm">
               <thead className="bg-[#e6f2ff] border-b border-slate-300">
                 <tr>
                   <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">{t("Directive")}</th>
                   <th className="p-3 uppercase font-bold text-xs text-[#0056b3] w-24">{t("Priority")}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-300">
                 {(activeTab === "dos" ? healthData.interventions.dos : healthData.interventions.donts).map((item) => (
                   <tr key={item.id} className="hover:bg-slate-50">
                     <td className="p-3 font-semibold">{t(item.text)}</td>
                     <td className="p-3">
                       <span className={`px-2 py-1 border text-xs font-bold uppercase ${priorityConfig[item.priority]}`}>
                         {t(item.priority)}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Daily Schedule */}
        <div className="border border-slate-300 flex flex-col">
          <div className="bg-slate-100 border-b border-slate-300 p-4 flex justify-between items-center">
            <h2 className="font-bold uppercase tracking-wide">{t("Daily Compliance Tracker")}</h2>
            <span className="font-bold text-sm bg-white border border-slate-300 px-3 py-1">
               {completedCount} / {healthData.dailyMandate.length} {t("MET")}
            </span>
          </div>
          <div className="p-4 flex-1 bg-white overflow-y-auto max-h-[300px]">
             <div className="space-y-2">
               {healthData.dailyMandate.map((task) => (
                 <label key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                   <div className="flex items-center gap-3">
                     <input 
                       type="checkbox" 
                       checked={checkedTasks[task.id]} 
                       onChange={() => toggleTask(task.id)}
                       className="w-5 h-5 accent-[#0056b3] cursor-pointer"
                     />
                     <span className={`text-sm font-bold ${checkedTasks[task.id] ? "line-through text-slate-500" : "text-slate-900"}`}>
                       {t(task.task)}
                     </span>
                   </div>
                   <span className="text-xs font-bold text-slate-500 mt-2 sm:mt-0 sm:ml-4">{t(task.time)}</span>
                 </label>
               ))}
             </div>
          </div>
        </div>

      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Lab Reports */}
        <div className="border border-slate-300">
          <div className="bg-slate-100 border-b border-slate-300 p-4">
            <h2 className="font-bold uppercase tracking-wide">{t("Diagnostics Overview")}</h2>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{t("Latest Verified Pathcare Records")}</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-300">
              <tr>
                <th className="p-3 uppercase font-bold text-xs text-slate-700">{t("Marker")}</th>
                <th className="p-3 uppercase font-bold text-xs text-slate-700">{t("Value (Ref)")}</th>
                <th className="p-3 uppercase font-bold text-xs text-slate-700 w-24">{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
               {healthData.labReports.map((r) => {
                 const s = statusConfig[r.status];
                 return (
                   <tr key={r.id}>
                     <td className="p-3 font-bold">{t(r.test)}</td>
                     <td className="p-3">
                       <div className="font-bold">{t(r.value)}</div>
                       <div className="text-xs text-slate-500">{t(r.range)}</div>
                     </td>
                     <td className="p-3">
                       <span className={`px-2 py-1 text-xs font-bold border border-current ${s.bg} ${s.text}`}>
                         {t(s.badge)}
                       </span>
                     </td>
                   </tr>
                 )
               })}
            </tbody>
          </table>
        </div>

        {/* Medicines */}
        <div className="border border-slate-300">
          <div className="bg-slate-100 border-b border-slate-300 p-4 flex justify-between items-center">
            <div>
              <h2 className="font-bold uppercase tracking-wide">{t("Approved Medication")}</h2>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{t("Stock and Dispensation Log")}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-300 bg-white">
             {healthData.medicines.map((m) => (
               <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50">
                 <div>
                   <h3 className="font-bold text-lg text-[#0056b3] uppercase">{t(m.name)} <span className="text-sm text-slate-600">({t(m.category)})</span></h3>
                   <p className="text-sm font-semibold mt-1">{t(m.dose)} — {t(m.frequency)}</p>
                   <p className="text-xs font-bold text-slate-500 uppercase mt-1">{t("Dispensation Time")}: {t(m.time)}</p>
                 </div>
                 <div className="mt-4 sm:mt-0 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                   <div className="text-xs font-bold uppercase text-slate-600 mb-1">{t("Available Stock")}</div>
                   <div className={`text-xl font-bold ${m.stock < 10 ? "text-red-600" : "text-slate-900"}`}>{m.stock} <span className="text-sm">/ {m.total}</span></div>
                   {m.stock < 10 && <div className="text-xs font-bold text-red-600 uppercase mt-1">{t("Requisition Needed")}</div>}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
