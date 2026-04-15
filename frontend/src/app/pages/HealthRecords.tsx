import { useEffect, useState } from "react";
import { FileText, Upload, AlertCircle, Download, Trash2, Eye, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface HealthRecordItem {
  id: string; type: string; title: string; date: string; file: string; file_url?: string; public_id?: string; uploaded_at?: string;
}

interface PatientData {
  id: number; user_id: number; name: string;
  age?: number; gender?: string; phone?: string; blood_group?: string;
  symptoms?: unknown[]; health_metrics?: Record<string, unknown>; health_records?: HealthRecordItem[]; prescriptions?: unknown[];
}

function normalizeRecords(records: unknown): HealthRecordItem[] {
  if (!Array.isArray(records)) return [];
  return records.map((record) => {
      const item = record as Partial<HealthRecordItem>;
      if (!item.title || !item.file) return null;
      return {
        id: String(item.id ?? `${Date.now()}-${Math.random()}`),
        type: String(item.type ?? "Record"), title: String(item.title),
        date: String(item.date ?? new Date().toLocaleDateString()), file: String(item.file),
        file_url: item.file_url ? String(item.file_url) : undefined,
        public_id: item.public_id ? String(item.public_id) : undefined,
        uploaded_at: item.uploaded_at ? String(item.uploaded_at) : undefined,
      };
    }).filter((r): r is HealthRecordItem => r !== null);
}

function inferRecordType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("xray") || lower.endsWith(".dcm")) return "X-Ray";
  if (lower.includes("mri")) return "MRI";
  if (lower.includes("ct")) return "CT Scan";
  if (lower.includes("prescription")) return "Prescription";
  if (lower.includes("blood") || lower.includes("lab")) return "Lab Report";
  return "Medical Record";
}

export function HealthRecords() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<"records" | "ai-diagnosis">("records");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showAIResults, setShowAIResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiTimestamp, setAiTimestamp] = useState("");
  const [aiError, setAiError] = useState("");
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [records, setRecords] = useState<HealthRecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordError, setRecordError] = useState("");
  const [recordSuccess, setRecordSuccess] = useState("");
  const [recordSaving, setRecordSaving] = useState(false);

  const [recordFile, setRecordFile] = useState<File | null>(null);
  const [recordTitle, setRecordTitle] = useState("");
  const [recordType, setRecordType] = useState("Medical Record");

  useEffect(() => {
    const fetchRecords = async () => {
      const activeUserId = user?.userId || (user as any)?.id;
      if (!activeUserId) {
        setRecordError("Authentication Fault: Patient identity not synchronized. Please re-login.");
        setRecordsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/patients/user/${activeUserId}`);
        if (!res.ok) throw new Error("Failed to synchronize health repository from master mainframe.");
        const data: PatientData = await res.json();
        setPatient(data); setRecords(normalizeRecords(data.health_records));
      } catch (err) { setRecordError(err instanceof Error ? err.message : "Network failure"); }
      finally { setRecordsLoading(false); }
    };
    fetchRecords();
  }, [user.userId, (user as any)?.id]);

  const saveRecordsToBackend = async (nextRecords: HealthRecordItem[]) => {
    if (!patient) throw new Error("Patient profile not found");
    const payload = { ...patient, health_records: nextRecords };
    const res = await fetch(`/patients/${patient.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to save remote record");
    const updated: PatientData = await res.json();
    setPatient(updated); setRecords(normalizeRecords(updated.health_records));
  };

  const handleRecordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordFile(file);
    if (!recordTitle.trim()) setRecordTitle(file.name.replace(/\.[^/.]+$/, ""));
    setRecordType(inferRecordType(file.name));
    setRecordError("");
  };

  const handleAddRecord = async () => {
    if (!recordFile || !recordTitle.trim()) {
      setRecordError("Missing file or title for repository upload."); return;
    }
    setRecordSaving(true); setRecordError(""); setRecordSuccess("");
    try {
      const uploadForm = new FormData(); uploadForm.append("file", recordFile);
      const res = await fetch("/health-records/upload", { method: "POST", body: uploadForm });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Remote transmission failed");

      const newRecord: HealthRecordItem = {
        id: data.public_id || `${Date.now()}`, type: recordType, title: recordTitle.trim(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        file: recordFile.name, file_url: data.file_url, public_id: data.public_id, uploaded_at: data.timestamp,
      };

      await saveRecordsToBackend([newRecord, ...records]);
      setRecordSuccess("Record accepted into official repository.");
      setRecordFile(null); setRecordTitle(""); setRecordType("Medical Record");
    } catch (err) { setRecordError(err instanceof Error ? err.message : "Error saving"); }
    finally { setRecordSaving(false); }
  };

  const handleDeleteRecord = async (id: string) => {
    setRecordSaving(true); setRecordError(""); setRecordSuccess("");
    try {
      await saveRecordsToBackend(records.filter((r) => r.id !== id));
      setRecordSuccess("Record successfully expunged.");
    } catch (err) { setRecordError(err instanceof Error ? err.message : "Error deleting"); }
    finally { setRecordSaving(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string); setShowAIResults(false);
        setAiError(""); setAiExplanation(""); setAiTimestamp("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!uploadedFile) return;
    setIsAnalyzing(true); setAiError("");
    try {
      const fd = new FormData(); fd.append("image", uploadedFile);
      fd.append("custom_prompt", "Explain this medical report in very easy language.");
      const res = await fetch("/health-records/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Analysis engine failure");
      setAiExplanation(data.explanation || "No explanation returned");
      setAiTimestamp(data.timestamp || new Date().toISOString());
      setShowAIResults(true);
    } catch (err) { setAiError(err instanceof Error ? err.message : "Fatal error"); setShowAIResults(false); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="w-full space-y-6 text-slate-900 font-sans pb-12">
      
      <div className="border border-slate-300 bg-slate-50 p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-tight">E-Health Repository</h1>
           <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wide">Manage central medical documents & AI diagnostics</p>
        </div>
      </div>

      {recordError && <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-sm font-bold uppercase tracking-wider">{recordError}</div>}
      {recordSuccess && <div className="p-3 bg-[#e8f5e9] border border-green-300 text-green-900 text-sm font-bold uppercase tracking-wider">{recordSuccess}</div>}

      <div className="flex bg-white border border-slate-300">
         <button onClick={() => setSelectedTab("records")} className={`flex-1 p-4 font-bold uppercase tracking-wide border-r border-slate-300 transition-none ${selectedTab === "records" ? "bg-[#0056b3] text-white" : "text-slate-600 hover:bg-slate-100"}`}>Registry Vault</button>
         <button onClick={() => setSelectedTab("ai-diagnosis")} className={`flex-1 p-4 font-bold uppercase tracking-wide transition-none ${selectedTab === "ai-diagnosis" ? "bg-[#0056b3] text-white" : "text-slate-600 hover:bg-slate-100"}`}>AI Diagnostic Scan</button>
      </div>

      {selectedTab === "records" ? (
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6 items-start">
          
          {/* Uploader Block */}
          <div className="border border-slate-300 bg-white">
             <div className="bg-slate-100 border-b border-slate-300 p-4">
               <h2 className="font-bold uppercase tracking-wide text-slate-900">Upload Transmission</h2>
             </div>
             <div className="p-4 space-y-4">
               <label className="block border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-slate-100 hover:border-[#0056b3] cursor-pointer">
                 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleRecordFileChange} className="hidden" />
                 <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                 <p className="font-bold text-sm text-[#0056b3] uppercase">{recordFile ? recordFile.name : "Select File"}</p>
                 <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">PDF, JPG, PNG (Max 10MB)</p>
               </label>
               
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Title</label>
                  <input type="text" value={recordTitle} onChange={e => setRecordTitle(e.target.value)} className="w-full border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:border-[#0056b3]" placeholder="e.g. CBC Mar 2026" />
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Type</label>
                  <select value={recordType} onChange={e => setRecordType(e.target.value)} className="w-full border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:border-[#0056b3]">
                    <option>Medical Record</option>
                    <option>Prescription</option>
                    <option>Lab Report</option>
                    <option>X-Ray</option>
                    <option>MRI</option>
                    <option>CT Scan</option>
                  </select>
               </div>

               <button onClick={handleAddRecord} disabled={recordSaving} className="w-full p-3 bg-[#0056b3] text-white font-bold uppercase tracking-wider hover:bg-blue-800 disabled:bg-slate-400">
                  {recordSaving ? "Transmitting..." : "Save to Vault"}
               </button>
             </div>
          </div>

          {/* Official Records Table */}
          <div className="border border-slate-300 bg-white">
             <div className="bg-slate-100 border-b border-slate-300 p-4">
               <h2 className="font-bold uppercase tracking-wide text-slate-900">Official Patient Records</h2>
             </div>
             
             {recordsLoading ? (
                <div className="p-8 text-center text-[#0056b3] font-bold uppercase tracking-wider">Accessing Mainframe...</div>
             ) : records.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">No records exist in the current scope.</div>
             ) : (
                <table className="w-full text-left text-sm divide-y divide-slate-300">
                  <thead className="bg-[#e6f2ff] text-[#0056b3] uppercase font-bold text-xs border-b border-slate-300 hidden sm:table-header-group">
                     <tr>
                        <th className="p-3 border-r border-slate-300">Doc Title / ID</th>
                        <th className="p-3 border-r border-slate-300">Category</th>
                        <th className="p-3 border-r border-slate-300">Date Logged</th>
                        <th className="p-3">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 block sm:table-row-group">
                    {records.map(record => (
                       <tr key={record.id} className="hover:bg-slate-50 block sm:table-row border-b sm:border-b-0 border-slate-300">
                         <td className="p-3 border-r border-slate-300 sm:table-cell block">
                           <div className="font-bold text-slate-900">{record.title}</div>
                           <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {record.id.slice(0,10)}</div>
                         </td>
                         <td className="p-3 border-r border-slate-300 sm:table-cell block">
                            <span className="px-2 py-1 bg-slate-200 text-slate-800 text-[10px] font-bold uppercase">{record.type}</span>
                         </td>
                         <td className="p-3 border-r border-slate-300 font-semibold sm:table-cell block text-xs">{record.date}</td>
                         <td className="p-3 sm:table-cell block">
                           <div className="flex gap-2">
                             {record.file_url && (
                               <a href={record.file_url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border border-[#0056b3] text-[#0056b3] text-xs font-bold uppercase hover:bg-[#e6f2ff]">View</a>
                             )}
                             <button onClick={() => handleDeleteRecord(record.id)} disabled={recordSaving} className="px-3 py-1 bg-white border border-red-500 text-red-600 text-xs font-bold uppercase hover:bg-red-50 ml-auto sm:ml-0"><Trash2 className="w-4 h-4"/></button>
                           </div>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      ) : (
        <div className="border border-slate-300 bg-white">
          <div className="bg-slate-100 border-b border-slate-300 p-4">
             <h2 className="font-bold uppercase tracking-wide text-slate-900">Diagnostic Scanner</h2>
          </div>

          {!uploadedImage ? (
             <div className="p-8">
               <label className="block border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center hover:border-[#0056b3] cursor-pointer max-w-xl mx-auto">
                 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                 <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                 <p className="font-bold text-[#0056b3] uppercase tracking-wide mb-2">Upload Medical Scan (Image)</p>
                 <p className="text-xs font-semibold text-slate-500 uppercase">Supported: X-Ray, MRI, CT, Dermatology (JPG/PNG)</p>
               </label>
             </div>
          ) : (
             <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
               {/* Left : Image preview */}
               <div className="border border-slate-300 p-2 bg-slate-50">
                  <img src={uploadedImage} alt="Scanned image" className="w-full h-auto bg-black max-h-[400px] object-contain border border-slate-300" />
                  {!showAIResults && (
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleAnalyzeImage} disabled={isAnalyzing} className="flex-1 p-3 bg-[#0056b3] text-white font-bold uppercase tracking-wider hover:bg-blue-800 disabled:bg-slate-400 flex justify-center items-center gap-2">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : "Initiate AI Scan"}
                      </button>
                      <button onClick={() => setUploadedImage(null)} className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100">Cancel</button>
                    </div>
                  )}
               </div>

               {/* Right : Results */}
               {showAIResults && (
                  <div className="space-y-4">
                     {aiError && <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-sm font-bold uppercase tracking-wider">{aiError}</div>}
                     <div className="border border-slate-300">
                        <div className="bg-[#0056b3] text-white p-3 font-bold uppercase tracking-wide text-sm flex justify-between items-center">
                           <span>Automated Findings</span>
                           <span className="text-[10px]">Triage Engine V2</span>
                        </div>
                        <div className="p-4 bg-white text-sm leading-relaxed whitespace-pre-wrap font-medium">
                           {aiExplanation}
                        </div>
                        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase flex justify-between">
                           <span>Scan Time: {new Date(aiTimestamp).toLocaleString()}</span>
                        </div>
                     </div>
                     <div className="p-4 bg-yellow-50 border border-yellow-300 flex items-start gap-3 text-yellow-900">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                           Non-diagnostic algorithm statement. Findings are preliminary and require verification by an authorized medical practitioner.
                        </div>
                     </div>
                     <div className="flex gap-4">
                       <button onClick={() => setUploadedImage(null)} className="flex-1 p-3 bg-white border border-[#0056b3] text-[#0056b3] font-bold uppercase hover:bg-[#e6f2ff]">New Scan</button>
                       <button onClick={() => window.location.href="/talk-to-doctor"} className="flex-1 p-3 bg-[#0056b3] text-white font-bold uppercase hover:bg-blue-800">Forward to Doctor</button>
                     </div>
                  </div>
               )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
