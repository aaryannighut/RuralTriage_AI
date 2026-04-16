import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Calendar, Clock, User, Video, CheckCircle, XCircle,
  Stethoscope, IndianRupee, MapPin, Loader2, AlertCircle,
  ClipboardList, Pill, FileText, AlertTriangle,
  Users, CheckSquare, ChevronDown, ChevronUp,
  Send, Plus, X, Eye, Sparkles, Activity, TrendingUp, Wifi, WifiOff
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DoctorProfile {
  id: number; name: string; specialty: string; qualification: string;
  experience: number; fee: number; hospital: string; city: string;
  state: string; verified: boolean; availability: string;
}

interface QueuePatient {
  appointment_id: number; patient_id: number; patient_name: string;
  age: number | null; gender: string | null; phone: string | null;
  blood_group: string | null; date: string; time: string; specialty: string;
  symptoms: { symptom_name: string; duration: string }[];
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface ScheduledAppointment {
  id: number; patient_id: number; patient_name: string;
  doctor_name: string; specialty: string; date: string;
  time: string; status: string; meeting_link: string | null;
  notes?: string;
}

interface HighRiskPatient {
  appointment_id: number; patient_id: number; patient_name: string;
  date: string; time: string; symptoms: any[]; priority: string; ai_summary: string;
}

interface PrescriptionItem { medicine: string; dosage: string; duration: string; notes: string; }

interface DashboardStats {
  today_patients: number; total_queued: number; completed: number; high_risk: number;
}

interface IssuedPrescription {
  id: number; patient_id: number; patient_name: string; doctor_id: number;
  items: { medicine: string; dosage: string; duration: string; notes: string }[];
  general_notes: string; triage_decision?: string; issued_at: string; issued_by: string; ai_clinical_note?: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const PRIORITY_STYLE: Record<string, string> = {
  HIGH:   "bg-red-100   text-red-800   border-red-300",
  MEDIUM: "bg-yellow-50 text-yellow-800 border-yellow-300",
  LOW:    "bg-slate-100 text-slate-600  border-slate-300",
};

const AVAIL_MAP: Record<string, { label: string; api: string; cls: string; dot: string }> = {
  Available: { label: "Available", api: "online",   cls: "bg-green-600 text-white",  dot: "bg-green-400" },
  Busy:      { label: "Busy",      api: "busy",     cls: "bg-yellow-600 text-white", dot: "bg-yellow-400" },
  "On Leave":{ label: "Off Duty",  api: "offline",  cls: "bg-red-600 text-white",    dot: "bg-red-400"   },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent = false, danger = false }: {
  label: string; value: string | number; icon: React.ReactNode; accent?: boolean; danger?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`border p-5 flex items-center justify-between bg-white ${danger ? "border-red-300 bg-red-50/40" : accent ? "border-[#0056b3] bg-[#f0f7ff]" : "border-slate-300"}`}>
      <div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{t(label)}</div>
        <div className={`text-3xl font-black ${danger ? "text-red-600" : accent ? "text-[#0056b3]" : "text-slate-900"}`}>{value}</div>
      </div>
      <div className="opacity-20 scale-150">{icon}</div>
    </div>
  );
}

// ── Prescription Form (modal) ─────────────────────────────────────────────────
function PrescriptionModal({ patient, doctorUserId, onSuccess, onCancel }: {
  patient: { patient_id: number; patient_name: string };
  doctorUserId: number;
  onSuccess: (msg: string, aiNote?: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [items, setItems] = useState<PrescriptionItem[]>([{ medicine: "", dosage: "", duration: "", notes: "" }]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [triage, setTriage] = useState<"treat_locally" | "refer_higher">("treat_locally");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, k: keyof PrescriptionItem, v: string) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.medicine || !i.dosage)) { setError(t("Medicine name + dosage required for every item.")); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/doctor/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          doctor_user_id: doctorUserId,
          medicines: items.map(i => ({ name: i.medicine, dosage: i.dosage, duration: i.duration, notes: i.notes })),
          notes: generalNotes,
          triage_decision: triage,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? "Dispatch failed"); }
      const data = await res.json();
      onSuccess(t("Prescription issued and dispatched."), data.ai_note ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Server error"));
    } finally { setSaving(false); }
  };

  const ic = "w-full px-3 py-2 border border-slate-300 bg-white text-sm font-semibold outline-none focus:border-[#0056b3] uppercase placeholder:normal-case placeholder:text-slate-400 placeholder:font-normal";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="px-3 py-2 bg-red-50 border border-red-300 text-red-800 text-xs font-bold uppercase">{error}</div>}

      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between mb-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("Medicine")} {i + 1}</span>
            {items.length > 1 && <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))}><X className="w-4 h-4 text-red-400 hover:text-red-600" /></button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Name")} *</label>
              <input required value={item.medicine} onChange={e => update(i, "medicine", e.target.value)} className={ic} placeholder="Paracetamol" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Dosage")} *</label>
              <input required value={item.dosage} onChange={e => update(i, "dosage", e.target.value)} className={ic} placeholder="500mg BD" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Duration")}</label>
              <input value={item.duration} onChange={e => update(i, "duration", e.target.value)} className={ic} placeholder="5 days" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Notes")}</label>
              <input value={item.notes} onChange={e => update(i, "notes", e.target.value)} className={ic} placeholder="After food" />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setItems(p => [...p, { medicine: "", dosage: "", duration: "", notes: "" }])}
        className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-[#0056b3] text-slate-400 hover:text-[#0056b3] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5" /> {t("Add Another Medicine")}
      </button>

      <div>
        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("General Clinical Notes")}</label>
        <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-slate-300 bg-white text-sm outline-none focus:border-[#0056b3] resize-none"
          placeholder={t("e.g. Rest, increase water intake, follow-up after 5 days...")} />
      </div>

      <div className="mb-2">
        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{t("Triage Recommendation")}</label>
        <div className="flex gap-2">
           <button 
             type="button" 
             onClick={() => setTriage("treat_locally")}
             className={`flex-1 py-3 border-2 flex flex-col items-center justify-center transition-all ${triage === "treat_locally" ? "bg-green-50 border-green-600 text-green-800" : "bg-white border-slate-200 text-slate-400"}`}
           >
              <CheckCircle className={`w-5 h-5 mb-1 ${triage === "treat_locally" ? "text-green-600" : "text-slate-200"}`} />
              <span className="text-[10px] font-black uppercase">{t("Treat Locally")}</span>
           </button>
           <button 
             type="button" 
             onClick={() => setTriage("refer_higher")}
             className={`flex-1 py-3 border-2 flex flex-col items-center justify-center transition-all ${triage === "refer_higher" ? "bg-blue-50 border-blue-600 text-blue-800" : "bg-white border-slate-200 text-slate-400"}`}
           >
              <TrendingUp className={`w-5 h-5 mb-1 ${triage === "refer_higher" ? "text-blue-600" : "text-slate-200"}`} />
              <span className="text-[10px] font-black uppercase">{t("Refer Higher")}</span>
           </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 border border-slate-300 text-slate-700 font-black uppercase text-xs hover:bg-slate-50">{t("Cancel")}</button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 bg-[#0056b3] text-white font-black uppercase text-xs tracking-widest hover:bg-blue-800 disabled:bg-slate-400 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {saving ? t("Dispatching...") : t("Issue Prescription")}
        </button>
      </div>
    </form>
  );
}

// ── Patient History Slide-Over ────────────────────────────────────────────────
function PatientHistoryPanel({ patientId, onClose, onPrescribe }: {
  patientId: number; onClose: () => void;
  onPrescribe: (p: { patient_id: number; patient_name: string }) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingAI, setLoadingAI]   = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/doctor/patient/${patientId}/history`);
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [patientId]);

  const fetchAI = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch("/doctor/ai/diagnosis-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, doctor_user_id: user.userId }),
      });
      if (res.ok) setAiSuggestion(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingAI(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
      <div className="w-full max-w-xl h-full bg-white border-l border-slate-300 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-[#0056b3] flex items-center justify-between shrink-0">
          <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" /> {t("Clinical Record")} — {t("Patient")} #{patientId}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0056b3]" /></div>
          ) : data ? (
            <>
              {/* Demographics */}
              <div className="bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-2 text-xs font-bold uppercase">
                {[
                  ["Name",       data.patient?.name],
                  ["Age",        data.patient?.age ?? "—"],
                  ["Gender",     data.patient?.gender ?? "—"],
                  ["Blood Grp",  data.patient?.blood_group ?? "—"],
                  ["Phone",      data.patient?.phone ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}><span className="text-slate-400">{t(k)}: </span><span>{v}</span></div>
                ))}
              </div>

              {/* Symptoms */}
              <section>
                <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.25em] mb-2">{t("Active Symptoms")}</h4>
                {data.symptoms?.length > 0 ? data.symptoms.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 mb-1.5 bg-yellow-50 border border-yellow-200 text-xs font-bold uppercase">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                    {s.symptom_name}
                    {s.duration && <span className="ml-auto text-slate-400 font-semibold">{s.duration}</span>}
                  </div>
                )) : <p className="text-xs text-slate-400 uppercase font-bold">{t("No symptoms on record.")}</p>}
              </section>

              {/* Past Appointments */}
              <section>
                <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.25em] mb-2">{t("Consultation History")}</h4>
                {data.past_appointments?.length > 0 ? data.past_appointments.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2 mb-1.5 border border-slate-200 bg-slate-50 text-xs font-bold uppercase">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{a.date} {a.time}</span>
                    <span className="text-slate-400">—</span>
                    <span>{a.doctor_name}</span>
                    <span className={`ml-auto px-2 py-0.5 text-[9px] font-black border ${a.status === "Completed" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{t(a.status)}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 uppercase font-bold">{t("No prior consultations.")}</p>}
              </section>

              {/* Health Records */}
              <section>
                <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.25em] mb-2">{t("Health Records")}</h4>
                {data.health_records?.length > 0 ? data.health_records.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 mb-1.5 border border-slate-200 bg-slate-50 text-xs font-bold uppercase">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {r.title || r.filename || `${t("Record")} ${i + 1}`}
                  </div>
                )) : <p className="text-xs text-slate-400 uppercase font-bold">{t("No records uploaded.")}</p>}
              </section>

              {/* Prior Prescriptions */}
              <section>
                <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.25em] mb-2">{t("Prior Prescriptions")}</h4>
                {data.prescriptions?.length > 0 ? data.prescriptions.slice(-3).reverse().map((p: any, i: number) => (
                  <div key={i} className="px-3 py-3 mb-1.5 border border-slate-200 bg-slate-50 text-xs font-bold relative">
                    <div className="text-slate-400 uppercase mb-1.5 flex justify-between items-start">
                       <span>{p.issued_at ? new Date(p.issued_at).toLocaleDateString() : "—"} — {p.issued_by}</span>
                       {p.triage_decision && (
                          <span className={`px-2 py-0.5 text-[8px] font-black border uppercase tracking-wider ${p.triage_decision === "treat_locally" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                             {p.triage_decision === "treat_locally" ? t("Managed Locally") : t("Referral Issued")}
                          </span>
                       )}
                    </div>
                    {(p.items || []).map((item: any, j: number) => (
                      <div key={j} className="uppercase text-slate-700">▶ {item.medicine} {item.dosage}{item.duration ? ` × ${item.duration}` : ""}</div>
                    ))}
                  </div>
                )) : <p className="text-xs text-slate-400 uppercase font-bold">{t("No prior prescriptions.")}</p>}
              </section>

              {/* AI Diagnosis Suggestion */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.25em]">{t("AI Diagnosis Assist")}</h4>
                  <button onClick={fetchAI} disabled={loadingAI}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0056b3] text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:bg-slate-400">
                    {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {loadingAI ? t("Analysing...") : t("Run AI Analysis")}
                  </button>
                </div>
                {aiSuggestion && (
                  <div className={`border p-4 text-xs ${aiSuggestion.ai_available ? "border-blue-200 bg-[#f0f7ff]" : "border-slate-200 bg-slate-50"}`}>
                    {!aiSuggestion.ai_available ? (
                      <p className="font-bold text-slate-500 uppercase">{t(aiSuggestion.message)}</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-red-600 uppercase">{t(aiSuggestion.disclaimer)}</p>
                        {aiSuggestion.suggestions?.differentials && (
                          <div>
                            <span className="font-black text-slate-700 uppercase">{t("Differentials")}: </span>
                            <span className="text-slate-600">{aiSuggestion.suggestions.differentials.join(", ")}</span>
                          </div>
                        )}
                        {aiSuggestion.suggestions?.investigations && (
                          <div>
                            <span className="font-black text-slate-700 uppercase">{t("Investigations")}: </span>
                            <span className="text-slate-600">{aiSuggestion.suggestions.investigations.join(", ")}</span>
                          </div>
                        )}
                        {aiSuggestion.suggestions?.drug_classes && (
                          <div>
                            <span className="font-black text-slate-700 uppercase">{t("Drug Classes")}: </span>
                            <span className="text-slate-600">{aiSuggestion.suggestions.drug_classes.join(", ")}</span>
                          </div>
                        )}
                        {aiSuggestion.suggestions?.urgency && (
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black border uppercase ${PRIORITY_STYLE[aiSuggestion.suggestions.urgency] ?? PRIORITY_STYLE.LOW}`}>
                            {t("Urgency")}: {aiSuggestion.suggestions.urgency}
                          </span>
                        )}
                        {aiSuggestion.suggestions?.raw && (
                          <p className="text-slate-600 whitespace-pre-wrap">{aiSuggestion.suggestions.raw}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          ) : <p className="text-sm font-bold text-red-600 uppercase text-center py-12">{t("Failed to load patient record.")}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => { onClose(); onPrescribe({ patient_id: patientId, patient_name: data?.patient?.name ?? `${t("Patient")} #${patientId}` }); }}
            className="w-full py-3 bg-[#0056b3] text-white font-black uppercase text-xs tracking-widest hover:bg-blue-800 flex items-center justify-center gap-2">
            <Pill className="w-4 h-4" /> {t("Issue Prescription")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Report Generation Modal ────────────────────────────────────────────────
function ReportGenerationModal({ appointment, doctorUserId, onSuccess, onCancel }: {
  appointment: ScheduledAppointment;
  doctorUserId: number;
  onSuccess: (msg: string, aiNote?: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<PrescriptionItem[]>([]);
  const [manualItems, setManualItems] = useState<PrescriptionItem[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [triage, setTriage] = useState<"treat_locally" | "refer_higher">("treat_locally");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const updateManual = (i: number, k: keyof PrescriptionItem, v: string) =>
    setManualItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/doctor/ai/report-suggestions/${appointment.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ai_available) setSuggestions(data.suggestions);
          else setError(data.message || t("AI Analysis unavailable"));
        }
      } catch { setError(t("Failed to synchronize with AI Registry.")); }
      finally { setLoading(false); }
    })();
  }, [appointment.id]);

  const toggleItem = (s: any) => {
    const exists = selectedItems.find(i => i.medicine === s.medicine);
    if (exists) setSelectedItems(p => p.filter(i => i.medicine !== s.medicine));
    else setSelectedItems(p => [...p, { medicine: s.medicine, dosage: s.dosage, duration: s.duration || t("5 days"), notes: s.reason || "" }]);
  };

  const handleDispatch = async () => {
    const allItems = [
      ...selectedItems,
      ...manualItems.filter(i => i.medicine && i.dosage)
    ];
    if (allItems.length === 0) { setError(t("Please select or manually add at least one medication.")); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/doctor/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: appointment.patient_id,
          doctor_user_id: doctorUserId,
          medicines: allItems.map(i => ({ name: i.medicine, dosage: i.dosage, duration: i.duration, notes: i.notes })),
          notes: clinicalNotes || `${t("Automated report based on symptoms")}: ${appointment.notes}`,
          triage_decision: triage,
        }),
      });
      if (!res.ok) throw new Error(t("Dispatch protocol failure."));
      const data = await res.json();
      onSuccess(t("Report dispatched to patient profile."), data.ai_note);
    } catch (err) { setError(err instanceof Error ? err.message : t("Server error")); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 p-4">
        <h4 className="text-[9px] font-black text-yellow-700 uppercase tracking-widest mb-1">{t("Recorded Symptoms")}</h4>
        <p className="text-xs font-bold text-slate-700 uppercase">{appointment.notes || t("No specific symptoms on record.")}</p>
      </div>

      <section>
        <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> {t("AI Suggested Medications")}
        </h4>
        
        {loading ? (
          <div className="flex items-center gap-3 py-6 justify-center text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t("Running AI Diagnostics...")}</span>
          </div>
        ) : error && suggestions.length === 0 ? (
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 text-[10px] font-black uppercase text-center">{error}</div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const active = selectedItems.some(item => item.medicine === s.medicine);
              return (
                <button key={i} onClick={() => toggleItem(s)}
                  className={`w-full p-3 text-left border transition-all flex items-center justify-between group
                    ${active ? "bg-[#0056b3] border-[#0056b3] text-white" : "bg-white border-slate-200 hover:border-[#0056b3] text-slate-700"}`}>
                  <div>
                    <div className="font-black uppercase text-xs">{s.medicine}</div>
                    <div className={`text-[10px] font-bold uppercase mt-0.5 ${active ? "text-white/70" : "text-slate-400"}`}>
                      {s.dosage} — {s.reason}
                    </div>
                  </div>
                  <div className={`w-5 h-5 border flex items-center justify-center
                    ${active ? "bg-white border-white text-[#0056b3]" : "bg-slate-50 border-slate-300 text-transparent"}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {manualItems.length > 0 && (
        <section>
          <h4 className="text-[9px] font-black text-[#0056b3] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Pill className="w-3 h-3" /> {t("Manually Added Medications")}
          </h4>
          <div className="space-y-4 mb-4">
            {manualItems.map((item, i) => (
              <div key={i} className="border border-slate-200 bg-slate-50 p-4 relative">
                <button type="button" onClick={() => setManualItems(p => p.filter((_, j) => j !== i))}
                  className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Name")} *</label>
                    <input required value={item.medicine} onChange={e => updateManual(i, "medicine", e.target.value)} 
                      className="w-full px-2 py-1.5 border border-slate-300 bg-white text-xs outline-none focus:border-[#0056b3] uppercase placeholder:normal-case font-bold" placeholder={t("Medicine Name")} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Dosage")} *</label>
                    <input required value={item.dosage} onChange={e => updateManual(i, "dosage", e.target.value)} 
                      className="w-full px-2 py-1.5 border border-slate-300 bg-white text-xs outline-none focus:border-[#0056b3] uppercase placeholder:normal-case font-bold" placeholder="10mg BD" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Duration")}</label>
                    <input value={item.duration} onChange={e => updateManual(i, "duration", e.target.value)} 
                      className="w-full px-2 py-1.5 border border-slate-300 bg-white text-xs outline-none focus:border-[#0056b3]" placeholder="3 days" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Notes")}</label>
                    <input value={item.notes} onChange={e => updateManual(i, "notes", e.target.value)} 
                      className="w-full px-2 py-1.5 border border-slate-300 bg-white text-xs outline-none focus:border-[#0056b3]" placeholder="After food" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <button type="button" onClick={() => setManualItems(p => [...p, { medicine: "", dosage: "", duration: "", notes: "" }])}
        className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-[#0056b3] text-slate-400 hover:text-[#0056b3] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-6">
        <Plus className="w-3.5 h-3.5" /> {t("Force Manual Add")}
      </button>

      <div>
        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{t("Triage Recommendation")}</label>
        <div className="flex gap-2">
           <button 
             type="button" 
             onClick={() => setTriage("treat_locally")}
             className={`flex-1 py-3 border-2 flex flex-col items-center justify-center transition-all ${triage === "treat_locally" ? "bg-green-50 border-green-600 text-green-800" : "bg-white border-slate-200 text-slate-400"}`}
           >
              <CheckCircle className={`w-5 h-5 mb-1 ${triage === "treat_locally" ? "text-green-600" : "text-slate-200"}`} />
              <span className="text-[10px] font-black uppercase">{t("Treat Locally")}</span>
           </button>
           <button 
             type="button" 
             onClick={() => setTriage("refer_higher")}
             className={`flex-1 py-3 border-2 flex flex-col items-center justify-center transition-all ${triage === "refer_higher" ? "bg-blue-50 border-blue-600 text-blue-800" : "bg-white border-slate-200 text-slate-400"}`}
           >
              <TrendingUp className={`w-5 h-5 mb-1 ${triage === "refer_higher" ? "text-blue-600" : "text-slate-200"}`} />
              <span className="text-[10px] font-black uppercase">{t("Refer Higher")}</span>
           </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 border border-slate-300 text-slate-700 font-black uppercase text-xs hover:bg-slate-50">{t("Cancel")}</button>
        <button type="button" onClick={handleDispatch} disabled={sending || loading}
          className="flex-1 py-3 bg-green-600 text-white font-black uppercase text-xs tracking-widest hover:bg-green-700 disabled:bg-slate-400 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? t("Dispatching...") : t("Generate & Send Report")}
        </button>
      </div>
    </div>
  );
}

// ── Page Section Wrapper ──────────────────────────────────────────────────────
function PageSection({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: string | number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="border border-slate-300 bg-white shadow-sm">
      <div className="w-full p-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-left">
        <h2 className="font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2 text-sm">
          <span className="text-[#0056b3]">{icon}</span>
          {t(title)}
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-white border border-slate-300 text-[9px] font-black uppercase text-[#0056b3]">{badge}</span>
          )}
        </h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ==============================================================================
// Main Dashboard
// ==============================================================================
export function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState<DoctorProfile | null>(null);
  const [queue,         setQueue]         = useState<QueuePatient[]>([]);
  const [schedule,      setSchedule]      = useState<ScheduledAppointment[]>([]);
  const [highRisk,      setHighRisk]      = useState<HighRiskPatient[]>([]);
  const [familyPatients, setFamilyPatients] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [availability,  setAvailability]  = useState("Available");

  const [viewingId,     setViewingId]     = useState<number | null>(null);
  const [prescribing,   setPrescribing]   = useState<{ patient_id: number; patient_name: string } | null>(null);
  const [rxSuccess,     setRxSuccess]     = useState("");
  const [rxAINote,      setRxAINote]      = useState("");
  const [stats,         setStats]         = useState<DashboardStats | null>(null);
  const [prescriptions, setPrescriptions] = useState<IssuedPrescription[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reportingApt, setReportingApt] = useState<ScheduledAppointment | null>(null);

  const [openSection, setOpenSection] = useState<string>("dashboard");
  const location = useLocation();

  // Sync openSection with URL hash
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace("#", "");
      if (['queue', 'appointments', 'prescriptions', 'family'].includes(sectionId)) {
        setOpenSection(sectionId);
      }
    } else {
      setOpenSection("dashboard");
    }
  }, [location.hash]);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!user.userId) {
      setLoading(false);
      return;
    }
    try {
      const [profRes, queueRes, schedRes, riskRes, statsRes, rxRes, notifyRes, famRes] = await Promise.all([
        fetch(`/doctors/user/${user.userId}`),
        fetch(`/doctor/patients/queue?user_id=${user.userId}`),
        fetch(`/doctor/appointments?user_id=${user.userId}`),
        fetch(`/doctor/high-risk-patients?user_id=${user.userId}`),
        fetch(`/doctor/dashboard/stats?user_id=${user.userId}`),
        fetch(`/doctor/prescriptions?user_id=${user.userId}`),
        fetch(`/doctor/notifications?user_id=${user.userId}`),
        fetch(`/doctor/family-patients?user_id=${user.userId}`),
      ]);

      if (!profRes.ok) throw new Error(t("Practitioner registry not found."));
      const profData: DoctorProfile = await profRes.json();
      setProfile(profData);
      setAvailability(profData.availability || "Available");

      if (queueRes.ok)  setQueue(await queueRes.json());
      if (schedRes.ok)  setSchedule(await schedRes.json());
      if (riskRes.ok)   setHighRisk(await riskRes.json());
      if (statsRes.ok)  setStats(await statsRes.json());
      if (rxRes.ok)     setPrescriptions(await rxRes.json());
      if (notifyRes.ok) setNotifications(await notifyRes.json());
      if (famRes.ok)    setFamilyPatients(await famRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Registry synchronization failure."));
    } finally { setLoading(false); }
  }, [user.userId, t]);

  useEffect(() => { reload(); }, [reload]);

  // ── Availability Toggle ───────────────────────────────────────────────────────
  const handleAvailability = async (status: string) => {
    if (!user.userId) return;
    const cfg = AVAIL_MAP[status];
    if (!cfg) return;
    setAvailability(status);
    try {
      await fetch("/doctor/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.userId, status: cfg.api }),
      });
    } catch { /* silent */ }
  };

  // ── Mark Complete ─────────────────────────────────────────────────────────────
  const handleMarkComplete = async (id: number) => {
    await fetch(`/appointments/complete/${id}`, { method: "PUT" });
    reload();
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const todayCount  = queue.filter(q => q.date === today).length;
  const completedCount = schedule.filter(s => s.status === "Completed").length;
  const avail = AVAIL_MAP[availability] ?? AVAIL_MAP["Available"];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#0056b3]" />
      <span className="text-sm font-bold uppercase tracking-widest text-slate-500">{t("Initializing Clinical Workspace...")}</span>
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 border border-red-200 text-red-900 max-w-2xl mx-auto mt-12">
      <div className="flex items-center gap-3 mb-4"><AlertCircle className="w-6 h-6" /><h2 className="font-bold uppercase">{t("Authorization Error")}</h2></div>
      <p className="text-sm font-semibold">{error}</p>
      <button onClick={() => navigate("/")} className="mt-6 px-6 py-2 bg-red-900 text-white font-bold uppercase text-xs">{t("Return to Hub")}</button>
    </div>
  );

  return (
    <div className="w-full space-y-6 font-sans pb-20 text-slate-900">

      {/* ── PATIENT HISTORY PANEL ── */}
      {viewingId !== null && (
        <PatientHistoryPanel
          patientId={viewingId}
          onClose={() => setViewingId(null)}
          onPrescribe={(p) => setPrescribing(p)}
        />
      )}

      {/* ── PRESCRIPTION MODAL ── */}
      {prescribing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-2xl my-8">
            <div className="bg-[#0056b3] p-4 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2 text-sm">
                <Pill className="w-4 h-4" /> {t("Prescription")} — {prescribing.patient_name}
              </h3>
              <button onClick={() => setPrescribing(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {rxSuccess ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="font-black uppercase text-green-900 text-sm">{rxSuccess}</p>
                  {rxAINote && (
                    <div className="mt-4 p-3 bg-[#f0f7ff] border border-blue-200 text-left text-xs text-slate-700">
                      <div className="flex items-center gap-1 text-[#0056b3] font-black uppercase mb-1"><Sparkles className="w-3 h-3" /> {t("AI Clinical Note")}</div>
                      {rxAINote}
                    </div>
                  )}
                  <button onClick={() => { setPrescribing(null); setRxSuccess(""); setRxAINote(""); }}
                    className="mt-6 px-8 py-2 bg-[#0056b3] text-white font-bold uppercase text-xs">{t("Close")}</button>
                </div>
              ) : (
                <PrescriptionModal
                  patient={prescribing}
                  doctorUserId={user.userId!}
                  onSuccess={(msg, ai) => { setRxSuccess(msg); setRxAINote(ai ?? ""); reload(); }}
                  onCancel={() => setPrescribing(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI REPORT MODAL ── */}
      {reportingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-xl my-8">
            <div className="bg-green-600 p-4 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" /> {t("AI Report Generation")} — {reportingApt.patient_name}
              </h3>
              <button onClick={() => setReportingApt(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {rxSuccess ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="font-black uppercase text-green-900 text-sm">{rxSuccess}</p>
                  <button onClick={() => { setReportingApt(null); setRxSuccess(""); reload(); }}
                    className="mt-6 px-8 py-2 bg-green-600 text-white font-bold uppercase text-xs">{t("Return to Dashboard")}</button>
                </div>
              ) : (
                <ReportGenerationModal
                  appointment={reportingApt}
                  doctorUserId={user.userId!}
                  onSuccess={(msg, ai) => { setRxSuccess(msg); if (ai) setRxAINote(ai); reload(); }}
                  onCancel={() => setReportingApt(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {openSection === "dashboard" && (
        <div className="space-y-6">
          {/* ── PROFILE BANNER ── */}
          <div className="bg-slate-50 border border-slate-300 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white border border-slate-300 flex items-center justify-center shadow-sm shrink-0">
                <Stethoscope className="w-8 h-8 text-[#0056b3]" />
              </div>
              <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black uppercase tracking-tight">{profile?.name}</h1>
              {profile?.verified && <span className="px-2 py-0.5 bg-[#e6f2ff] text-[#0056b3] border border-blue-200 text-[8px] font-black uppercase tracking-widest">{t("Verified")}</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs font-bold text-slate-500 uppercase">
              <span className="text-[#0056b3]">{profile?.specialty}</span>
              <span>• {profile?.qualification}</span>
              <span>• {profile?.experience ?? "—"} {t("Yrs")}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3 text-[#0056b3]" />{profile?.hospital}, {profile?.city}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t("Consult Fee")}</div>
            <div className="font-black text-slate-900 flex items-center gap-0.5">
              <IndianRupee className="w-3.5 h-3.5" />{profile?.fee}
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 ${avail.cls} text-[9px] font-black uppercase tracking-widest`}>
            <span className={`w-2 h-2 rounded-full ${avail.dot} animate-pulse`} />
            {t(avail.label)}
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      {notifications.length > 0 && (
        <div className="border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-[#0056b3] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-black uppercase text-[#0056b3] text-sm">{t("Clinical Notifications")}</p>
              <div className="mt-3 space-y-2">
                {notifications.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map(n => (
                  <div key={n.id} className="bg-white border border-blue-100 p-3 flex items-center justify-between gap-4 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{n.message}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{new Date(n.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMERGENCY ALERTS ── */}
      {highRisk.length > 0 && (
        <div className="border-l-4 border-red-600 border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-black uppercase text-red-900 text-sm">
                ⚠️ {highRisk.length} {t("High-Risk Patient")}{highRisk.length > 1 ? "s" : ""} {t("In Queue")}
              </p>
              <div className="mt-3 space-y-2">
                {highRisk.map(p => (
                  <div key={p.appointment_id} className="bg-white border border-red-200 p-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-black text-xs uppercase text-red-900">{p.patient_name}</span>
                      <p className="text-[10px] text-slate-600 mt-0.5">{p.ai_summary}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setViewingId(p.patient_id)}
                        className="p-1.5 border border-slate-300 bg-white hover:bg-slate-100"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setReportingApt({
                          id: p.appointment_id,
                          patient_id: p.patient_id,
                          patient_name: p.patient_name,
                          doctor_name: profile?.name || "Doctor",
                          specialty: profile?.specialty || "Medicine",
                          date: p.date,
                          time: p.time,
                          status: "Scheduled",
                          meeting_link: null,
                          notes: p.symptoms?.map((s: any) => `${s.symptom_name} (${s.duration || 'unknown'})`).join(", ") || t("High risk symptoms.")
                      })}
                        className="p-1.5 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                        title={t("Generate AI Report based on symptoms")}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => navigate(`/test-call?room=room-${p.appointment_id}`)}
                        className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase hover:bg-red-700 flex items-center gap-1">
                        <Video className="w-3 h-3" /> {t("Join")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Patients" value={stats?.today_patients ?? todayCount} icon={<Users className="w-8 h-8" />} accent />
        <StatCard label="Total Queued"     value={stats?.total_queued ?? queue.length} icon={<ClipboardList className="w-8 h-8" />} />
        <StatCard label="Completed"        value={stats?.completed ?? completedCount} icon={<CheckCircle className="w-8 h-8" />} />
        <StatCard label="High Risk" value={stats?.high_risk ?? highRisk.length} icon={<AlertTriangle className="w-8 h-8" />} danger={(stats?.high_risk ?? highRisk.length) > 0} />
      </div>

      {/* ── AVAILABILITY CONTROL ── */}
      <div className="border border-slate-300 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-4 h-4 text-[#0056b3]" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-700">{t("Availability")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AVAIL_MAP).map(([key, cfg]) => (
            <button key={key} onClick={() => handleAvailability(key)}
              className={`px-5 py-2 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border transition-all ${
                availability === key ? `${cfg.cls} border-transparent` : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}>
              <span className={`w-2 h-2 rounded-full ${availability === key ? cfg.dot : "bg-slate-300"}`} />
              {t(cfg.label)}
            </button>
          ))}
        </div>
      </div>

        </div>
      )}

      {openSection === "queue" && (
        <PageSection title="Patient Queue" icon={<ClipboardList className="w-5 h-5" />} badge={`${queue.length} ${t("pending")}`}>
        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest border-t border-slate-200">
            {t("No patients in queue.")}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {queue.map((p, i) => (
              <div key={p.appointment_id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${p.priority === "HIGH" ? "bg-red-50/40" : ""}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 flex items-center justify-center font-black text-sm shrink-0
                    ${p.priority === "HIGH" ? "bg-red-600 text-white" : "bg-[#0056b3] text-white"}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-sm truncate">{p.patient_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{p.date} {p.time}</div>
                    {p.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.symptoms.slice(0, 3).map((s, j) => (
                          <span key={j} className="px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-[9px] font-bold uppercase text-yellow-800">{s.symptom_name}</span>
                        ))}
                        {p.symptoms.length > 3 && <span className="text-[9px] text-slate-400">+{p.symptoms.length - 3} {t("more")}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-1 text-[9px] font-black border uppercase ${PRIORITY_STYLE[p.priority]}`}>{t(p.priority)}</span>
                  <button onClick={() => setViewingId(p.patient_id)}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPrescribing({ patient_id: p.patient_id, patient_name: p.patient_name })}
                    className="p-2 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3]">
                    <Pill className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setReportingApt({
                      id: p.appointment_id,
                      patient_id: p.patient_id,
                      patient_name: p.patient_name,
                      doctor_name: profile?.name || "Doctor",
                      specialty: p.specialty,
                      date: p.date,
                      time: p.time,
                      status: "Scheduled",
                      meeting_link: null,
                      notes: p.symptoms?.map(s => `${s.symptom_name} (${s.duration || 'unknown'})`).join(", ") || t("No specific symptoms on record.")
                  })}
                    className="p-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                    title={t("Generate AI Report based on symptoms")}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigate(`/test-call?room=room-${p.appointment_id}`)}
                    className="px-4 py-2 bg-[#0056b3] text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 flex items-center gap-1">
                    <Video className="w-3 h-3" /> {t("Consult")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </PageSection>
      )}

      {openSection === "family" && (
        <PageSection title="Enrolled Family Patients" icon={<User className="w-5 h-5" />} badge={`${familyPatients.length} ${t("enrolled")}`}>
          {familyPatients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest border-t border-slate-200">
              {t("No patients have enrolled you as their family doctor yet.")}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {familyPatients.map((p) => (
                <div key={p.patient_id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 flex items-center justify-center font-black text-sm shrink-0 bg-[#0056b3] text-white">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold uppercase text-sm truncate">{p.patient_name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{t("Age")}: {p.age || "N/A"} • {t("Gender")}: {p.gender || "N/A"} • {t("Phone")}: {p.phone || "N/A"}</div>
                      {p.symptoms && p.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.symptoms.slice(0, 3).map((s: any, j: number) => (
                            <span key={j} className="px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-[9px] font-bold uppercase text-yellow-800">{s.symptom_name}</span>
                          ))}
                          {p.symptoms.length > 3 && <span className="text-[9px] text-slate-400">+{p.symptoms.length - 3} {t("more")}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewingId(p.patient_id)}
                      className="px-3 py-2 flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 outline-none" title={t("View Medical Record")}>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t("History")}</span>
                    </button>
                    <button onClick={() => setPrescribing({ patient_id: p.patient_id, patient_name: p.patient_name })}
                      className="px-3 py-2 flex items-center gap-1.5 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3] outline-none" title={t("Issue Prescription")}>
                      <Pill className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t("Prescribe")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>
      )}

      {openSection === "appointments" && (
        <PageSection title="Appointment Schedule" icon={<Calendar className="w-5 h-5" />} badge={`${schedule.length} ${t("total")}`}>
        {schedule.length === 0 ? (
          <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest">{t("No appointments on record.")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#e6f2ff] border-b border-slate-300">
                <tr>
                  {[t("Patient"), t("Date / Time"), t("Status"), t("Actions")].map(h => (
                    <th key={h} className="px-5 py-3 text-[9px] font-black text-[#0056b3] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedule.map(apt => {
                  const isToday = apt.date === today;
                  const isPast  = apt.date < today;
                  return (
                    <tr key={apt.id} className={`hover:bg-slate-50 ${isToday ? "bg-[#fffbea]" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="font-bold uppercase text-xs">{apt.patient_name}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                        {apt.date}<br /><span className="text-slate-400">{apt.time}</span>
                      </td>
                      <td className="px-5 py-4">
                        {isToday
                          ? <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[9px] font-black uppercase">{t("Today")}</span>
                          : apt.status === "Completed"
                          ? <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-[9px] font-black uppercase">{t("Completed")}</span>
                          : isPast
                          ? <span className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black uppercase">{t("Past")}</span>
                          : <span className="px-2 py-1 bg-[#e6f2ff] text-[#0056b3] border border-blue-200 text-[9px] font-black uppercase">{t("Scheduled")}</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewingId(apt.patient_id)}
                            className="px-3 py-2 flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600" title={t("View History")}>
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{t("History")}</span>
                          </button>
                          <button onClick={() => setPrescribing({ patient_id: apt.patient_id, patient_name: apt.patient_name })}
                            className="px-3 py-2 flex items-center gap-1.5 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3]" title={t("Issue Prescription")}>
                            <Pill className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{t("Prescribe")}</span>
                          </button>
                           <button onClick={() => setReportingApt(apt)}
                             className="px-3 py-2 flex items-center gap-1.5 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                             title={t("Generate AI Report based on symptoms")}>
                             <Sparkles className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest">{t("AI Report")}</span>
                           </button>
                           <button onClick={() => navigate(`/test-call?room=room-${apt.id}`)}
                             className="px-3 py-2 bg-[#0056b3] text-white text-[9px] font-black uppercase hover:bg-blue-800 flex items-center gap-1">
                             <Video className="w-3 h-3" /> {t("Start")}
                           </button>
                          {apt.status === "Scheduled" && (
                            <button onClick={() => handleMarkComplete(apt.id)}
                              className="p-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700">
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </PageSection>
      )}

      {openSection === "prescriptions" && (
        <PageSection title="Issued Prescriptions" icon={<Pill className="w-5 h-5" />} badge={`${prescriptions.length} ${t("issued")}`}>
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest border-t border-slate-200">
            {t("No prescriptions issued yet.")}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {prescriptions.map((rx, i) => (
              <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                {/* Header row */}
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-sm truncate">{rx.patient_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                      {rx.issued_at
                        ? new Date(rx.issued_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"} • {rx.issued_by}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rx.triage_decision && (
                       <span className={`px-2 py-1 text-[9px] font-black border uppercase tracking-widest ${rx.triage_decision === "treat_locally" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {rx.triage_decision === "treat_locally" ? t("Local") : t("Referral")}
                       </span>
                    )}
                    <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-[9px] font-black uppercase">{t("Issued")}</span>
                    <button
                      onClick={() => setPrescribing({ patient_id: rx.patient_id, patient_name: rx.patient_name })}
                      className="p-1.5 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3]"
                      title={t("Issue new prescription for this patient")}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Medicine chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(rx.items || []).map((item, j) => (
                    <span key={j} className="inline-flex items-center gap-1 px-2 py-1 bg-[#e6f2ff] border border-blue-200 text-[10px] font-bold uppercase text-[#0056b3]">
                      <Pill className="w-3 h-3" />
                      {item.medicine} {item.dosage}{item.duration ? ` × ${item.duration}` : ""}
                    </span>
                  ))}
                </div>

                {/* General notes */}
                {rx.general_notes && (
                  <div className="mt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2 uppercase">
                    📋 {rx.general_notes}
                  </div>
                )}

                {/* AI clinical note */}
                {rx.ai_clinical_note && (
                  <div className="mt-2 text-[10px] text-[#0056b3] border border-blue-100 bg-[#f0f7ff] p-2 flex gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{rx.ai_clinical_note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </PageSection>
      )}

    </div>
  );
}
