import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  Plus, Search, Edit2, Trash2, X, Package, ShieldAlert, Pill, 
  Loader2, AlertCircle, MapPin, Phone, Building2, TrendingUp, ClipboardList, Sparkles,
  CheckCircle2, XCircle, FileText, IndianRupee, History, LayoutDashboard
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface RxItem {
  medicine: string;
  dosage: string;
  duration: string;
  notes: string;
}

interface IncomingPrescription {
  id: string; // UUID from backend
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  issued_by: string;
  issued_at: string;
  status: "pending" | "accepted" | "dispensed" | "rejected";
  items: RxItem[];
  general_notes?: string;
  ai_clinical_note?: string;
}

interface PharmacyProfile {
  id: number;
  user_id: number;
  pharmacist_name: string;
  store_name: string;
  degree: string;
  license_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  opening_hours: string;
  verified: boolean;
}

type Category = "Diabetes" | "Cholesterol" | "Blood Pressure" | "Antibiotic" | "Pain Relief" | "Supplement" | "Cardiac" | "Thyroid" | "Antacid" | "Other";

interface Medicine {
  id: number;
  name: string;
  brand: string;
  category: Category;
  dose: string;
  form: string;
  price: number;
  stock: number;
  min_stock: number;
  manufacturer: string;
  expiry: string;
}

const CATEGORIES: Category[] = [
  "Diabetes", "Cholesterol", "Blood Pressure", "Antibiotic", "Pain Relief", "Supplement", "Cardiac", "Thyroid", "Antacid", "Other",
];

export function PharmacistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [rxList, setRxList] = useState<IncomingPrescription[]>([]);
  const [stats, setStats] = useState({ total_inventory: 0, active_requests: 0, low_stock: 0, market_status: "active" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"dispensary" | "inventory" | "history">("dispensary");
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"All" | Category>("All");

  // Selected Rx for detailed processing
  const [selectedRx, setSelectedRx] = useState<IncomingPrescription | null>(null);
  const [processingStatus, setProcessingStatus] = useState(false);

  // Inventory Modal States
  const [showInvModal, setShowInvModal] = useState(false);
  const [invFormData, setInvFormData] = useState({ id: null as number | null, medicine_name: "", quantity: "" as string | number, price: "" as string | number, expiry_date: "" });
  const [savingInv, setSavingInv] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (["dispensary", "inventory", "history"].includes(hash)) {
      setActiveTab(hash as any);
    }
  }, [location.hash]);

  const fetchData = async () => {
    if (!user.userId) return;
    try {
      const profRes = await fetch(`/pharmacies/user/${user.userId}`);
      if (!profRes.ok) throw new Error("Pharmacy profile not found.");
      const profData = await profRes.json();
      setProfile(profData);

      const [invRes, rxRes, statsRes, histRes] = await Promise.all([
        fetch(`/pharmacies/pharmacy/inventory/${profData.id}`),
        fetch(`/pharmacies/pharmacy/prescriptions/${profData.id}`),
        fetch(`/pharmacies/pharmacy/dashboard/stats?pharmacy_id=${profData.id}`),
        fetch(`/pharmacies/pharmacy/transactions/${profData.id}`)
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData.map((inv: any) => ({
           id: inv.id,
           name: inv.medicine_name,
           stock: inv.quantity,
           price: inv.price,
           expiry: inv.expiry_date,
           brand: "Verified", // Fallback
           category: "Other" // Fallback
        })));
      }
      if (rxRes.ok) setRxList(await rxRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (histRes.ok) setHistoryList(await histRes.json());

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { 
    fetchData(); 
  }, [user.userId]);

  // Real-time polling (10 seconds)
  useEffect(() => {
    if (!user.userId) return;
    const interval = setInterval(() => {
      fetchData();
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [user.userId]);

  const handleUpdateStatus = async (rxId: string, status: string) => {
    setProcessingStatus(true);
    try {
      const res = await fetch(`/pharmacies/pharmacy/prescription/${rxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update dispensation status.");
      
      // If dispensed, we should ideally decrement stock in the backend (ideally the backend handles this).
      // For this dynamic overhaul, we reload the data immediately.
      await fetchData();
      setSelectedRx(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingStatus(false);
    }
  };

  const isExpiringSoon = (expiryStr: string) => {
    if (!expiryStr) return false;
    const expiryDate = new Date(expiryStr);
    if (isNaN(expiryDate.getTime())) return false;
    const diffTime = expiryDate.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const exportHistoryCSV = () => {
    if (historyList.length === 0) return;
    const headers = ["Date", "Medicine", "Quantity Change", "Action"];
    const rows = historyList.map(txn => {
      const d = txn.date ? new Date(txn.date).toLocaleString() : "N/A";
      return `"${d}","${txn.medicine}","${txn.quantity_change}","${txn.action}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dispensary_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveInventory = async () => {
    if (!profile) return;
    setSavingInv(true);
    try {
      const q = parseInt(invFormData.quantity.toString()) || 0;
      const p = parseFloat(invFormData.price.toString()) || 0;

      if (invFormData.id) {
         // Update
         const res = await fetch(`/pharmacies/pharmacy/inventory/update/${invFormData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: q, price: p, expiry_date: invFormData.expiry_date })
         });
         if (!res.ok) throw new Error("Failed to update inventory.");
      } else {
         // Add
         const res = await fetch(`/pharmacies/pharmacy/inventory/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                pharmacy_id: profile.id, 
                medicine_name: invFormData.medicine_name, 
                quantity: q, 
                price: p, 
                expiry_date: invFormData.expiry_date 
            })
         });
         if (!res.ok) throw new Error("Failed to add inventory.");
      }
      setShowInvModal(false);
      fetchData();
    } catch(err: any) {
      alert(err.message);
    } finally {
      setSavingInv(false);
    }
  };

  const handleDeleteInventory = async (invId: number) => {
    if (!confirm("Are you sure you want to remove this medication from inventory?")) return;
    try {
      const res = await fetch(`/pharmacies/pharmacy/inventory/delete/${invId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete inventory.");
      fetchData();
    } catch(err: any) {
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setInvFormData({ id: null, medicine_name: "", quantity: "", price: "", expiry_date: "" });
    setShowInvModal(true);
  };

  const openEditModal = (m: Medicine) => {
    setInvFormData({ id: m.id, medicine_name: m.name, quantity: m.stock, price: m.price, expiry_date: m.expiry });
    setShowInvModal(true);
  };

  const calculateBill = (items: RxItem[]) => {
    return items.reduce((acc, item) => {
      const med = inventory.find(m => m.name.toLowerCase() === item.medicine.toLowerCase());
      return acc + (med?.price || 0);
    }, 0);
  };

  const filteredInv = inventory.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q);
    return matchSearch;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#0056b3]" />
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Syncing Dispensary Mainframe...</span>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="bg-white border-b-4 border-[#0056b3] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#0056b3] p-3 text-white shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{profile?.store_name}</h1>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-[#0056b3]"/> License: {profile?.license_number}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#0056b3]"/> {profile?.city}, {profile?.state}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button className="px-4 py-2 bg-[#0056b3] text-white text-[10px] font-black uppercase shadow-md hover:bg-blue-800 transition-all">Support Desk</button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Requests", val: stats.active_requests, icon: ClipboardList, color: "blue" },
          { label: "Total Inventory (SKU)", val: stats.total_inventory, icon: Package, color: "slate" },
          { label: "Low Stock Alerts", val: stats.low_stock, icon: AlertCircle, color: "red" },
          { label: "Market Status", val: stats.market_status.toUpperCase(), icon: TrendingUp, color: "green" },
        ].map((stat, i) => (
          <div key={i} className={`bg-white border-l-4 border-slate-600 border border-slate-200 p-4 shadow-sm group hover:shadow-md transition-all`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`text-xl font-black mt-1 text-slate-900`}>{stat.val}</div>
              </div>
              <stat.icon className={`w-8 h-8 text-slate-100`} />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-300 bg-white">
        {[
          { id: "dispensary", label: "Active Dispensary", icon: LayoutDashboard },
          { id: "inventory", label: "Inventory Pool", icon: Pill },
          { id: "history", label: "Transaction History", icon: History },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); navigate(`#${tab.id}`); }}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-slate-50 text-[#0056b3] border-b-2 border-[#0056b3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SECTION 1: DISPENSARY ────────────────────────────────────────────────── */}
      {activeTab === "dispensary" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-100 p-4 border border-slate-300 flex items-center justify-between">
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"/> Incoming Queue</h2>
               <span className="text-[9px] font-black bg-white border border-slate-300 px-2 py-0.5">{rxList.length} New</span>
            </div>
            
            <div className="space-y-3">
              {rxList.map(rx => (
                <div 
                  key={rx.id} 
                  onClick={() => setSelectedRx(rx)}
                  className={`p-4 border cursor-pointer transition-all hover:translate-x-1 ${selectedRx?.id === rx.id ? "bg-[#0056b3] text-white border-[#0056b3] shadow-lg" : "bg-white border-slate-200 text-slate-900 shadow-sm"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Rx-#{rx.id.slice(0,8)}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 border ${rx.status === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-green-100 text-green-800 border-green-200"}`}>{rx.status}</span>
                  </div>
                  <h3 className="font-black uppercase text-sm leading-tight">{rx.patient_name}</h3>
                  <p className={`text-[10px] font-bold mt-1 ${selectedRx?.id === rx.id ? "text-blue-100" : "text-slate-400"}`}>{rx.doctor_name || rx.issued_by} • {new Date(rx.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
              {rxList.length === 0 && (
                <div className="py-20 bg-white border border-dash border-slate-200 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Active Requisitions</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Processing Detail */}
          <div className="lg:col-span-2">
            {!selectedRx ? (
              <div className="h-full bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <LayoutDashboard className="w-16 h-16 mb-4 opacity-10" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Selection Required</h3>
                <p className="text-xs font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">Select an incoming digital prescription from the queue to initiate dispensation workflow.</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none font-black text-6xl transform rotate-12">DISPENSARY</div>
                
                {/* Rx Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Medical Prescription</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Authenticated Digital Order • Patient Ref: P-{selectedRx.patient_id}</p>
                  </div>
                  <button onClick={() => setSelectedRx(null)} className="p-2 hover:bg-white/10 transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prescribing Clinician</p>
                      <p className="text-lg font-black uppercase text-slate-900">{selectedRx.doctor_name || selectedRx.issued_by}</p>
                      <p className="text-[10px] font-bold text-[#0056b3] uppercase mt-0.5">Verified Medical Practitioner</p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Timestamp</p>
                      <p className="text-sm font-bold uppercase text-slate-700">{new Date(selectedRx.issued_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  {/* Medicine List */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4 flex items-center gap-2">
                       <Pill className="w-4 h-4" /> Itemized Medication list
                    </h4>
                    <div className="divide-y-2 divide-slate-50 border-y border-slate-100">
                      {selectedRx.medicines.map((item, id) => (
                        <div key={id} className="py-4 flex justify-between group">
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="text-base font-black uppercase text-slate-900">{item.medicine}</p>
                               <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5">X{item.duration || "Course"}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-wide">{item.dosage} • {item.notes}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-slate-900">₹{inventory.find(m => m.name.toLowerCase() === item.medicine.toLowerCase())?.price || "—"}</p>
                             {inventory.find(m => m.name.toLowerCase() === item.medicine.toLowerCase())?.stock === 0 && <p className="text-[9px] font-black text-red-600 uppercase mt-1 animate-pulse">STOCK FAILURE</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing Summary */}
                  <div className="bg-slate-50 p-6 border-l-8 border-[#0056b3] flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Calculated Dispensation Cost</p>
                      <div className="flex items-center text-4xl font-black text-[#0056b3] tracking-tighter">
                         <IndianRupee className="w-8 h-8" strokeWidth={3} />
                         {calculateBill(selectedRx.medicines)}
                      </div>
                    </div>
                    <div className="hidden md:block opacity-10 group-hover:opacity-20 transition-opacity">
                       <FileText className="w-12 h-12" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-3 pt-6">
                    {selectedRx.status === "pending" ? (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(selectedRx.id, "accepted")}
                          disabled={processingStatus}
                          className="flex-1 py-4 bg-[#0056b3] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-blue-800 transition-all flex justify-center items-center gap-2"
                        >
                           {processingStatus ? <Loader2 className="animate-spin w-4 h-4"/> : "Accept Prescription"}
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedRx.id, "rejected")}
                          disabled={processingStatus}
                          className="px-8 py-4 bg-white border-2 border-red-600 text-red-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-red-50 transition-all"
                        >
                           Out of Stock
                        </button>
                      </>
                    ) : (
                      <button 
                         onClick={() => handleUpdateStatus(selectedRx.id, "dispensed")}
                         disabled={processingStatus}
                         className="flex-1 py-4 bg-green-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-green-700 transition-all flex justify-center items-center gap-2"
                      >
                         {processingStatus ? <Loader2 className="animate-spin w-4 h-4"/> : <CheckCircle2 className="w-5 h-5"/>}
                         Finalize dispensation & Update Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 2: INVENTORY ────────────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
           {/* Controls */}
           <div className="bg-white border border-slate-300 p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
              <div className="relative flex-1 container">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" placeholder="QUERY INVENTORY REGISTRY..." value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 text-xs font-black uppercase outline-none focus:border-[#0056b3] transition-all"
                 />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={openAddModal} className="flex-1 md:flex-none px-6 py-3 bg-[#0056b3] text-white font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2 whitespace-nowrap">
                   <Plus className="w-4 h-4" /> Add Medication
                </button>
              </div>
           </div>

           {/* Table */}
           <div className="bg-white border-2 border-slate-900 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                       <tr>
                          <th className="px-6 py-4">Clinical Naming</th>
                          <th className="px-6 py-4 text-center">Operational Stock</th>
                          <th className="px-6 py-4">Unit Pricing</th>
                          <th className="px-6 py-4">Expiry</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredInv.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                             <td className="px-6 py-5">
                                <div className="font-black text-slate-900 uppercase text-sm">{m.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">{m.brand || "Generics"}</div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex flex-col items-center gap-1">
                                   <div className={`px-4 py-1 text-[11px] font-black border uppercase tracking-tighter ${m.stock < 10 ? "bg-red-50 text-red-600 border-red-200" : "bg-[#e8f5e9] text-green-700 border-green-200"}`}>
                                      {m.stock} Units
                                   </div>
                                   {m.stock < 10 && <span className="text-[8px] font-black text-white bg-red-600 px-2 py-0.5 rounded-sm uppercase tracking-widest animate-pulse">Low Stock</span>}
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="font-black text-slate-900 flex items-center gap-0.5">
                                   <IndianRupee className="w-3.5 h-3.5" strokeWidth={3}/>
                                   {m.price}
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex flex-col items-start gap-1">
                                   <span className="text-[10px] font-black uppercase text-slate-500">{m.expiry || "N/A"}</span>
                                   {isExpiringSoon(m.expiry) && <span className="text-[8px] font-black text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-sm uppercase tracking-widest animate-pulse">Expiring Soon</span>}
                                </div>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => openEditModal(m)} className="p-2 border border-slate-200 bg-white hover:bg-[#0056b3] hover:text-white transition-all"><Edit2 className="w-3.5 h-3.5"/></button>
                                   <button onClick={() => handleDeleteInventory(m.id)} className="p-2 border border-slate-200 bg-white hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* ── SECTION 3: HISTORY ────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white border-2 border-slate-900 shadow-xl overflow-hidden">
           <div className="bg-slate-900 p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Dispensation Ledger</h2>
              <button onClick={exportHistoryCSV} className="text-[9px] font-black text-[#0056b3] uppercase tracking-widest flex items-center gap-1 bg-white px-3 py-1 hover:bg-slate-200 transition-colors">Export CSV</button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                    <tr>
                       <th className="px-6 py-4">Transaction Date</th>
                       <th className="px-6 py-4">Medicine List</th>
                       <th className="px-6 py-4 text-center">Qty Change</th>
                       <th className="px-6 py-4 text-center">Action</th>
                       <th className="px-6 py-4 text-right">Audit</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {historyList.map((txn, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                             <div className="text-xs font-black text-slate-900 uppercase">{txn.date ? new Date(txn.date).toLocaleDateString() : "N/A"}</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-0.5">{txn.date ? new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-sm font-black text-slate-900 uppercase">{txn.medicine}</div>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <span className={`text-base font-black ${txn.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}>{txn.quantity_change > 0 ? `+${txn.quantity_change}` : txn.quantity_change}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${txn.action === "added" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{txn.action}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <button className="text-[10px] font-black text-[#0056b3] uppercase tracking-widest underline decoration-2 underline-offset-4">Audit Details</button>
                          </td>
                       </tr>
                    ))}
                    {historyList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <History className="w-12 h-12 mx-auto text-slate-100 mb-2" />
                          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No Historical Records Compiled</p>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* ADD/EDIT INVENTORY MODAL */}
      {showInvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-4 border-slate-900 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest">{invFormData.id ? "Update Operational Stock" : "Registry Add: New Medication"}</h3>
                <button onClick={() => setShowInvModal(false)} className="hover:text-red-400 transition-colors"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Clinical Designation</label>
                  <input type="text" value={invFormData.medicine_name} onChange={e => setInvFormData({...invFormData, medicine_name: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50 disabled:cursor-not-allowed" placeholder="E.g. PARACETAMOL 500MG"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Stock Quantity</label>
                     <input type="number" value={invFormData.quantity} onChange={e => setInvFormData({...invFormData, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none" min="0"/>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Unit Price (₹)</label>
                     <input type="number" value={invFormData.price} onChange={e => setInvFormData({...invFormData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none" min="0" step="0.01"/>
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Expiry Horizon (YYYY-MM)</label>
                  <input type="month" value={invFormData.expiry_date} onChange={e => setInvFormData({...invFormData, expiry_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none"/>
                </div>
                <button onClick={handleSaveInventory} disabled={savingInv || !invFormData.medicine_name} className="w-full py-4 mt-2 bg-[#0056b3] text-white font-black uppercase tracking-widest text-xs shadow-md hover:bg-blue-800 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingInv ? <Loader2 className="w-4 h-4 animate-spin"/> : "Execute Registry Commit"}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
