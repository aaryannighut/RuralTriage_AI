import { useState, useEffect, useRef } from "react";
import { CheckCircle, Clock, Thermometer, Activity, Trash2, Loader2, Bot, ShieldAlert, Send, Wind, Brain, Battery, Heart, Droplets, Flame, Frown, AlertCircle, AlertTriangle, CircleDot, RefreshCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SavedSymptom {
  id?: number;
  symptom_name: string;
  duration: string;
  recorded_at: string;
}

interface PatientData {
  id: number;
  user_id: number;
  name: string;
  symptoms: SavedSymptom[];
}

interface TriageResult {
  summary: string;
  possible_conditions: string[];
  explanation: string[];
  medical_advice: string[];
  next_steps: string[];
  risk_level: "Low" | "Medium" | "High";
  precautions: string[];
}

interface TriageEvent {
  id: string;
  role: "user" | "bot";
  data: TriageResult | string;
  time: string;
}

export function CheckSymptoms() {
  const { user } = useAuth();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const [triageHistory, setTriageHistory] = useState<TriageEvent[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [followUpInput, setFollowUpInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const commonSymptoms = [
    { id: "fever", label: "Fever", icon: Thermometer },
    { id: "cough", label: "Cough", icon: Wind },
    { id: "headache", label: "Headache", icon: Brain },
    { id: "fatigue", label: "Fatigue", icon: Battery },
    { id: "bodyache", label: "Body Ache", icon: Heart },
    { id: "cold", label: "Cold/Runny Nose", icon: Droplets },
    { id: "sore-throat", label: "Sore Throat", icon: Flame },
    { id: "nausea", label: "Nausea", icon: Frown },
    { id: "diarrhea", label: "Diarrhea", icon: AlertCircle },
    { id: "vomiting", label: "Vomiting", icon: AlertTriangle },
    { id: "rash", label: "Skin Rash", icon: CircleDot },
    { id: "dizziness", label: "Dizziness", icon: RefreshCcw },
  ];

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [triageHistory, chatLoading]);

  useEffect(() => {
    const fetchPatient = async () => {
      const activeUserId = user?.userId || (user as any)?.id;
      if (!activeUserId) {
        setError("Please log in as a patient to track symptoms");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/patients/user/${activeUserId}`);
        if (!res.ok) {
          if (res.status === 404) { setPatient(null); setLoading(false); return; }
          throw new Error("Failed to load patient data from regional triage central.");
        }
        const data: PatientData = await res.json();
        setPatient(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cross-reference patient profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [user.userId, (user as any)?.id]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  };

  const callAIAnalysis = async (symptomLabels: string[], dur: string) => {
    setChatLoading(true);
    setShowResult(true);
    setTriageHistory([]);

    try {
      const res = await fetch("/patients/ai/symptom-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom_names: symptomLabels, duration: dur }),
      });
      
      let data;
      try { 
        data = await res.json(); 
      } catch { 
        throw new Error(`Server error`); 
      }

      if (!res.ok) throw new Error(data.detail || "AI analysis failed");

      const initialEvent: TriageEvent = {
        id: crypto.randomUUID(),
        role: "bot",
        data: data,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTriageHistory([initialEvent]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setChatLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const query = followUpInput.trim();
    if (!query || chatLoading) return;

    setFollowUpInput("");
    setChatLoading(true);

    const userEvent: TriageEvent = {
        id: crypto.randomUUID(),
        role: "user",
        data: query,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTriageHistory(prev => [...prev, userEvent]);

    try {
        const lastAnalysis = [...triageHistory].reverse().find(e => e.role === "bot")?.data as TriageResult;
        
        const res = await fetch("/patients/triage/followup", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                previous_analysis: lastAnalysis,
                user_query: query 
            }),
        });

        if (!res.ok) throw new Error("Follow-up failed");
        const data = await res.json();

        const botEvent: TriageEvent = {
            id: crypto.randomUUID(),
            role: "bot",
            data: data,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setTriageHistory(prev => [...prev, botEvent]);
    } catch (err) {
        setError("Contextual analysis failed. Please try again.");
    } finally {
        setChatLoading(false);
    }
  };

  const handleAddSymptom = async () => {
    if (selectedSymptoms.length === 0 || !duration) {
      setError("MANDATORY FIELDS MISSING: Select at least one symptom and duration.");
      return;
    }
    setSaving(true); setError(""); setSuccessMessage("");
    try {
      const symptomNames = selectedSymptoms.map((id) => commonSymptoms.find((s) => s.id === id)?.label || id);
      const activeUserId = user?.userId || (user as any)?.id;
      if (patient && patient.id) {
        const res = await fetch(`/patients/${patient.id}/symptoms/batch`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptom_names: symptomNames, duration }),
        });
        if (res.ok) {
          const refreshRes = await fetch(`/patients/user/${activeUserId}`);
          if (refreshRes.ok) setPatient(await refreshRes.json());
          setSuccessMessage(`SYMPTOMS RECORDED. INITIATING TRIAGE.`);
        }
      } else {
         setSuccessMessage(`INITIATING TRIAGE PROTOCOL.`);
      }
      setTimeout(() => setSuccessMessage(""), 3000);
      callAIAnalysis(symptomNames, duration);
      setSelectedSymptoms([]); setDuration("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "TRANSMISSION ERROR");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSymptom = async (symptomName: string, recordedAt: string, symptomId?: number) => {
    if (!patient || !patient.id) return;
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (symptomId) params.set("symptom_id", String(symptomId));
      else params.set("recorded_at", recordedAt);
      const activeUserId = user?.userId || (user as any)?.id;
      const res = await fetch(`/patients/${patient.id}/symptoms/${encodeURIComponent(symptomName)}?${params.toString()}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to purge symptom");
      const res2 = await fetch(`/patients/user/${activeUserId}`);
      if (res2.ok) setPatient(await res2.json());
    } catch (err) { setError(err instanceof Error ? err.message : "Error purging record"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-12 text-center text-[#0056b3] uppercase font-bold flex items-center justify-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Retrieving Patient Payload...
    </div>
  );

  if (!user.userId) return (
    <div className="w-full max-w-4xl mx-auto p-6 mt-12 bg-red-50 border border-red-300 flex items-center flex-col text-center">
       <ShieldAlert className="w-12 h-12 text-red-700 mb-3" />
       <h2 className="text-xl font-bold text-red-900 uppercase">Unauthorized Access</h2>
       <p className="text-red-800 font-semibold mt-2">Authentication required for clinical symptom logging.</p>
    </div>
  );

  return (
    <div className="w-full space-y-6 text-slate-900 font-sans pb-12">
      
      <div className="border border-slate-300 bg-slate-50 p-6">
           <h1 className="text-2xl font-bold uppercase tracking-tight">Symptom Triage System</h1>
           <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wide">Automated Symptom Analysis & Registry</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-bold uppercase">{error}</div>}
      {successMessage && <div className="p-3 bg-green-50 border border-green-300 text-green-900 text-xs font-bold uppercase">{successMessage}</div>}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="border border-slate-300 bg-white">
          <div className="bg-slate-100 border-b border-slate-300 p-4">
            <h2 className="font-bold uppercase tracking-wide text-sm">1. Identify Current Symptoms</h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {commonSymptoms.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom.id);
              return (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`p-3 border text-[10px] font-bold uppercase tracking-wider transition-none flex flex-col items-center justify-center text-center gap-2 ${isSelected ? "border-[#0056b3] bg-[#0056b3] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#0056b3] hover:text-[#0056b3]"}`}
                >
                  <symptom.icon className="w-4 h-4 mx-auto" />
                  {symptom.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-slate-100 border-t border-b border-slate-300 mt-2">
            <h2 className="font-bold uppercase tracking-wide text-sm">2. Duration of Symptoms</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {["Less than 24h", "1-3 days", "4-7 days", "More than 7 days"].map((option) => (
              <button
                key={option}
                onClick={() => setDuration(option)}
                className={`py-3 px-2 border text-[10px] font-bold uppercase ${duration === option ? "border-[#0056b3] bg-[#0056b3] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#0056b3]"}`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-300">
             <button
                onClick={handleAddSymptom}
                disabled={selectedSymptoms.length === 0 || !duration || saving}
                className="w-full py-4 bg-[#0056b3] text-white font-bold uppercase disabled:bg-slate-300 flex justify-center items-center gap-3"
             >
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : "Submit & Start Triage"}
             </button>
          </div>
        </div>

        <div className="border border-slate-300 bg-white h-[650px] flex flex-col relative overflow-hidden">
            <div className="bg-[#0056b3] text-white p-4 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-wider text-xs">RuralTriage AI Engine</h3>
              </div>
              {chatLoading && <Loader2 className="w-4 h-4 animate-spin text-white opacity-50" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#f5f9ff] space-y-6 flex flex-col">
              {!showResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 text-center space-y-4">
                  <Activity className="w-12 h-12 opacity-10" />
                  <p className="uppercase font-bold text-[10px] tracking-widest">Awaiting Clinical Data...</p>
                </div>
              ) : (
                <div className="space-y-8 pb-20">
                  {triageHistory.map((event) => (
                    <div key={event.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {event.role === "user" ? (
                        <div className="flex justify-end mb-4">
                           <div className="bg-[#0056b3] text-white p-3 border border-blue-800 shadow-sm max-w-[85%]">
                              <p className="text-xs font-bold leading-relaxed">{event.data as string}</p>
                              <div className="text-[8px] font-black uppercase mt-1 opacity-50 text-right">{event.time} | PATIENT QUERY</div>
                           </div>
                        </div>
                      ) : (
                        <TriageDashboard result={event.data as TriageResult} time={event.time} />
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-center items-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0056b3] opacity-40" />
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>

            {showResult && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-2xl z-20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="Enter additional details..."
                    onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                    disabled={chatLoading}
                    className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 text-xs font-bold focus:outline-none focus:border-[#0056b3] placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleFollowUp}
                    disabled={chatLoading || !followUpInput.trim()} 
                    className="bg-[#0056b3] text-white px-6 py-2 font-black uppercase text-[10px] tracking-widest disabled:bg-slate-300 flex items-center gap-2 transition-all hover:bg-blue-800"
                  >
                     <Send className="w-4 h-4" /> ASK
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {patient?.symptoms?.length ? (
        <div className="border border-slate-300 bg-white">
            <div className="bg-slate-100 border-b border-slate-300 p-4">
                <h3 className="font-bold uppercase tracking-wide text-xs">Symptom Historical Log</h3>
            </div>
            <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-300">
                {patient.symptoms.slice().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map((symptom, idx) => (
                <div key={symptom.id ?? idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                        <div className="font-bold text-xs uppercase text-slate-900">{symptom.symptom_name}</div>
                        <div className="text-[10px] font-semibold text-[#0056b3] mt-1 uppercase tracking-wider">Duration: {symptom.duration}</div>
                    </div>
                    <button onClick={() => handleRemoveSymptom(symptom.symptom_name, symptom.recorded_at, symptom.id)} disabled={saving} className="p-2 text-red-600 hover:bg-red-50 border border-slate-100 uppercase font-black text-[9px] tracking-widest">
                        Purge record
                    </button>
                </div>
                ))}
            </div>
        </div>
      ) : null}
      
      {showResult && (
        <div className="text-center">
             <button onClick={() => { setShowResult(false); setTriageHistory([]); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#0056b3] tracking-widest border-b border-transparent hover:border-[#0056b3] py-2">
                ← Reset Analysis Engine
             </button>
        </div>
      )}
    </div>
  );
}

function TriageDashboard({ result, time }: { result: TriageResult, time: string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 border-l-4 border-slate-200 pl-4">
            <div className="md:col-span-2 border border-slate-200 bg-white p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Summary</h4>
                <p className="text-xs font-bold text-slate-900 leading-tight">{result.summary}</p>
            </div>

            <div className={`border p-3 bg-white shadow-sm ${result.risk_level === "High" ? "border-red-400" : result.risk_level === "Medium" ? "border-yellow-400" : "border-green-400"}`}>
                <h4 className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Risk Level</h4>
                <div className={`text-lg font-black uppercase tracking-tighter ${result.risk_level === "High" ? "text-red-700" : result.risk_level === "Medium" ? "text-yellow-700" : "text-green-700"}`}>
                    {result.risk_level}
                </div>
            </div>

            <div className="border border-slate-200 bg-white p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Possible Conditions</h4>
                <div className="flex flex-wrap gap-1">
                    {result.possible_conditions.map((c, i) => (
                        <span key={i} className="text-[9px] font-bold bg-slate-50 text-slate-600 px-2 py-0.5 border border-slate-200">{c}</span>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 border border-slate-200 bg-white p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Clinical Explanation</h4>
                <ul className="space-y-1">
                    {result.explanation.map((e, i) => (
                        <li key={i} className="text-[10px] font-bold text-slate-600 flex items-start gap-2">
                           <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" /> {e}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="border border-slate-200 bg-red-50 p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-red-400 uppercase mb-1 tracking-widest">Medical Advice</h4>
                {result.medical_advice.map((a, i) => (
                    <p key={i} className="text-[10px] font-black text-red-800 leading-tight uppercase mb-1 italic">! {a}</p>
                ))}
            </div>

            <div className="border border-slate-200 bg-white p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Actionable Steps</h4>
                <ul className="space-y-1">
                    {result.next_steps.map((s, i) => (
                        <li key={i} className="text-[10px] font-bold text-[#0056b3] flex items-center gap-2">
                            <Clock className="w-3 h-3" /> {s}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="md:col-span-2 border border-slate-300 bg-[#eff6ff] p-3 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-700 uppercase mb-2 tracking-widest">Precautions (2-3 Days)</h4>
                <div className="grid grid-cols-2 gap-1">
                    {result.precautions.map((p, i) => (
                        <div key={i} className="text-[9px] font-bold text-slate-600 bg-white p-2 border border-slate-100 flex items-center gap-2">
                             <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                             {p}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="md:col-span-2 flex items-center gap-4 opacity-20 mt-2">
                <div className="flex-1 h-[1px] bg-slate-400"></div>
                <div className="text-[8px] font-black uppercase whitespace-nowrap tracking-[0.2em]">{time} | AI ANALYSIS</div>
                <div className="flex-1 h-[1px] bg-slate-400"></div>
            </div>
        </div>
    );
}
