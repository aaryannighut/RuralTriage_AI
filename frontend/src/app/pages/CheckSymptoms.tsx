import { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, Clock, Thermometer, Activity, Trash2, Loader2, Bot, Send, ShieldAlert } from "lucide-react";
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

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const commonSymptoms = [
    { id: "fever", label: "Fever", icon: Thermometer },
    { id: "cough", label: "Cough", icon: Activity },
    { id: "headache", label: "Headache", icon: Activity },
    { id: "fatigue", label: "Fatigue", icon: Activity },
    { id: "bodyache", label: "Body Ache", icon: Activity },
    { id: "cold", label: "Cold/Runny Nose", icon: Activity },
    { id: "sore-throat", label: "Sore Throat", icon: Activity },
    { id: "nausea", label: "Nausea", icon: Activity },
    { id: "diarrhea", label: "Diarrhea", icon: Activity },
    { id: "vomiting", label: "Vomiting", icon: Activity },
    { id: "rash", label: "Skin Rash", icon: Activity },
    { id: "dizziness", label: "Dizziness", icon: Activity },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!user.userId) {
        setError("Please log in as a patient to track symptoms");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/patients/by-user/${user.userId}`);
        if (!res.ok) {
          if (res.status === 404) { setPatient(null); setLoading(false); return; }
          throw new Error("Failed to load patient data");
        }
        const data: PatientData = await res.json();
        setPatient(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient data");
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [user.userId]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  };

  const callAIAnalysis = async (symptomLabels: string[], dur: string) => {
    setChatLoading(true);
    setShowChat(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: `Symptoms: ${symptomLabels.join(", ")}\nDuration: ${dur}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/patients/ai/symptom-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom_names: symptomLabels, duration: dur }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Server error`); }
      if (!res.ok) throw new Error(data.detail || "AI analysis failed");

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        text: data.analysis,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "bot",
        text: `Error parsing symptoms: ${err instanceof Error ? err.message : ""}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput(""); setChatLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/patients/ai/symptom-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom_names: [text], duration: "Not specified" }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Server error`); }
      if (!res.ok) throw new Error(data.detail || "AI failed");

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "bot", text: data.analysis,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
       setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: "Error during dispatch", time: "" }]);
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
      if (patient && patient.id) {
        const res = await fetch(`/patients/${patient.id}/symptoms/batch`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptom_names: symptomNames, duration }),
        });
        if (res.ok) {
          const refreshRes = await fetch(`/patients/by-user/${user.userId}`);
          if (refreshRes.ok) setPatient(await refreshRes.json());
          setSuccessMessage(`SYMPTOMS RECORDED (${symptomNames.length}). INITIATING TRIAGE PROTOCOL.`);
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
      const res = await fetch(`/patients/${patient.id}/symptoms/${encodeURIComponent(symptomName)}?${params.toString()}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to purge symptom");
      const res2 = await fetch(`/patients/by-user/${user.userId}`);
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
      
      <div className="border border-slate-300 bg-slate-50 p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-tight">Symptom Triage System</h1>
           <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wide">Automated Symptom Analysis & Registry</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-sm font-bold uppercase tracking-wider">{error}</div>}
      {successMessage && <div className="p-3 bg-[#e8f5e9] border border-green-300 text-green-900 text-sm font-bold uppercase tracking-wider">{successMessage}</div>}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="border border-slate-300 bg-white">
          <div className="bg-slate-100 border-b border-slate-300 p-4">
            <h2 className="font-bold uppercase tracking-wide">1. Identify Current Symptoms</h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {commonSymptoms.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom.id);
              return (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`p-3 border text-xs font-bold uppercase tracking-wider transition-none flex flex-col items-center justify-center text-center gap-2 ${isSelected ? "border-[#0056b3] bg-[#0056b3] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#0056b3] hover:text-[#0056b3]"}`}
                >
                  <symptom.icon className="w-5 h-5 mx-auto" />
                  {symptom.label}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-100 border-t border-b border-slate-300 p-4 mt-2">
            <h2 className="font-bold uppercase tracking-wide">2. Duration of Symptoms</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {["Less than 24h", "1-3 days", "4-7 days", "More than 7 days"].map((option) => (
              <button
                key={option}
                onClick={() => setDuration(option)}
                className={`py-3 px-2 border text-xs font-bold uppercase transition-none ${duration === option ? "border-[#0056b3] bg-[#0056b3] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#0056b3]"}`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-300">
             <button
                onClick={handleAddSymptom}
                disabled={selectedSymptoms.length === 0 || !duration || saving}
                className="w-full py-4 bg-[#0056b3] text-white border-none font-bold uppercase tracking-wider disabled:bg-slate-300 disabled:text-slate-500 hover:bg-blue-800 flex justify-center items-center gap-3"
             >
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : "Submit & Start Triage"}
             </button>
          </div>
        </div>

        <div className="space-y-6">
          {showChat && (
            <div className="border border-slate-300 bg-white flex flex-col h-[500px]">
              <div className="bg-[#0056b3] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-sm">RuralTriage AI Engine</h3>
                </div>
                {chatLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 divide-y divide-transparent">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-3 border ${msg.role === "user" ? "bg-[#e6f2ff] border-[#0056b3] text-slate-900" : "bg-white border-slate-300 text-slate-900"}`}>
                       <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                       <p className="text-[10px] uppercase font-bold text-slate-500 mt-2 text-right">{msg.time} {msg.role === "bot" && "| AI Engine"}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-slate-300 bg-white">
                <form onSubmit={(e) => { e.preventDefault(); handleChatSend(); }} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enter additional details..."
                    disabled={chatLoading}
                    className="flex-1 px-3 py-2 border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0056b3]"
                  />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()} className="px-5 py-2 bg-[#0056b3] text-white font-bold uppercase disabled:bg-slate-300">
                     Ask
                  </button>
                </form>
              </div>
            </div>
          )}

          {patient?.symptoms?.length ? (
            <div className="border border-slate-300 bg-white">
               <div className="bg-slate-100 border-b border-slate-300 p-4">
                  <h3 className="font-bold uppercase tracking-wide">Symptom Historical Log</h3>
               </div>
               <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-300">
                  {patient.symptoms.slice().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map((symptom, idx) => (
                    <div key={symptom.id ?? idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                       <div>
                          <div className="font-bold text-sm uppercase text-slate-900">{symptom.symptom_name}</div>
                          <div className="text-xs font-semibold text-[#0056b3] mt-1">DUR: {symptom.duration}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-1">{new Date(symptom.recorded_at).toLocaleString()}</div>
                       </div>
                       <button onClick={() => handleRemoveSymptom(symptom.symptom_name, symptom.recorded_at, symptom.id)} disabled={saving} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200">
                          <Trash2 className="w-4 h-4"/>
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
