import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  Plus, Search, Edit2, Trash2, X, Package, ShieldAlert, Pill, 
  Loader2, AlertCircle, MapPin, Phone, Building2, TrendingUp, ClipboardList, Sparkles,
  CheckCircle2, XCircle, FileText, IndianRupee, History, LayoutDashboard
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { toApiUrl } from "../config/runtime";

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
  medicines: RxItem[];
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

export function PharmacistDispensary() {
  const { t } = useLanguage();
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
  const [preparingOrder, setPreparingOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<{name: string, quantity: number, price: number, stock: number}[]>([]);

  // Inventory Filter Overrides
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState(false);



  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (["dispensary", "inventory", "history"].includes(hash)) {
      setActiveTab(hash as any);
    }
  }, [location.hash]);

  const fetchData = async () => {
    if (!user.userId) return;
    try {
      const profRes = await fetch(toApiUrl(`/pharmacies/user/${user.userId}`));
      if (!profRes.ok) throw new Error(t("Pharmacy profile not found."));
      const profData = await profRes.json();
      setProfile(profData);

      const [invRes, rxRes, statsRes, histRes] = await Promise.all([
        fetch(toApiUrl(`/pharmacies/pharmacy/inventory/${profData.id}`)),
        fetch(toApiUrl(`/pharmacies/pharmacy/prescriptions/${profData.id}`)),
        fetch(toApiUrl(`/pharmacies/pharmacy/dashboard/stats?pharmacy_id=${profData.id}`)),
        fetch(toApiUrl(`/pharmacies/pharmacy/transactions/${profData.id}`))
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData.map((inv: any) => ({
           id: inv.id,
           name: inv.medicine_name,
           stock: inv.quantity,
           price: inv.price,
           expiry: inv.expiry_date,
           brand: inv.brand || "Generics",
           category: inv.category || "Other",
           dose: inv.dose || "N/A",
           form: inv.form || "Tablet",
           manufacturer: inv.manufacturer || "N/A"
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
      const res = await fetch(toApiUrl(`/pharmacies/pharmacy/prescription/${rxId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error(t("Failed to update dispensation status."));
      
      await fetchData();
      setSelectedRx(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingStatus(false);
    }
  };

  const startOrderPrep = () => {
    if (!selectedRx) return;
    const prep = selectedRx.medicines.map(m => {
        const invMatch = inventory.find(i => i.name.toLowerCase() === m.medicine.toLowerCase());
        return {
            name: m.medicine,
            quantity: invMatch && invMatch.stock > 0 ? 1 : 0, 
            price: invMatch ? invMatch.price : 0,
            stock: invMatch ? invMatch.stock : 0
        };
    });
    setOrderItems(prep);
    setPreparingOrder(true);
  };

  const updateOrderItemQty = (idx: number, qty: number) => {
    const arr = [...orderItems];
    arr[idx].quantity = Math.max(0, Math.min(qty, arr[idx].stock)); // clamp between 0 and available stock
    setOrderItems(arr);
  };

  const finalizeDispensation = async () => {
    if (!selectedRx) return;
    setProcessingStatus(true);
    try {
        const billedAmt = orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const itemsPayload = orderItems.filter(i => i.quantity > 0).map(i => ({ medicine_name: i.name, quantity: i.quantity, price: i.price }));
        
        const res = await fetch(toApiUrl(`/pharmacies/pharmacy/prescription/${selectedRx.id}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
               status: "dispensed",
               pharmacy_id: profile?.id,
               items: itemsPayload,
               total_billed: billedAmt
            })
        });
        if (!res.ok) throw new Error("Failed to finalize order.");
        
        await fetchData();
        setPreparingOrder(false);
        setSelectedRx(null);
    } catch(err: any) {
        alert(err.message);
    } finally {
        setProcessingStatus(false);
    }
  };

  const printInvoice = () => {
    window.print();
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



  const calculateBill = (items: RxItem[]) => {
    return items.reduce((acc, item) => {
      const med = inventory.find(m => m.name.toLowerCase() === item.medicine.toLowerCase());
      return acc + (med?.price || 0);
    }, 0);
  };

  const filteredInv = inventory.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q);
    const matchLowStock = !filterLowStock || m.stock < 10;
    const matchExpiring = !filterExpiring || isExpiringSoon(m.expiry);
    return matchSearch && matchLowStock && matchExpiring;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#0056b3]" />
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("Syncing Dispensary Mainframe...")}</span>
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
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t(profile?.store_name || "")}</h1>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-[#0056b3]"/> {t("License")}: {profile?.license_number}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#0056b3]"/> {t(profile?.city || "")}, {t(profile?.state || "")}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => alert(t("Connecting to RuralTriage Help Desk... \n\nEmergency Support: +91-90000-00000"))}
             className="px-4 py-2 bg-[#0056b3] text-white text-[10px] font-black uppercase shadow-md hover:bg-blue-800 transition-all">{t("Support Desk")}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Requests", val: stats.active_requests, icon: ClipboardList },
          { label: "Total Orders", val: stats.total_orders || 0, icon: CheckCircle2 },
          { label: "Revenue (₹)", val: stats.revenue || 0, icon: IndianRupee },
          { label: "Total SKU", val: stats.total_inventory, icon: Package },
          { label: "Low Stock", val: stats.low_stock, icon: AlertCircle },
        ].map((stat, i) => (
          <div key={i} className={`bg-white border-l-4 border-slate-600 border border-slate-200 p-4 shadow-sm group hover:shadow-md transition-all`}>
            <div className="flex justify-between items-center">
              <div className="truncate">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t(stat.label)}</p>
                <div className={`text-xl font-black mt-1 text-slate-900`}>{stat.val}</div>
              </div>
              <stat.icon className={`w-6 h-6 text-slate-100 flex-shrink-0`} />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-300 bg-white">
        {[
          { id: "dispensary", label: "Active Dispensary", icon: LayoutDashboard },
          { id: "history", label: "Transaction History", icon: History },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); navigate(`#${tab.id}`); }}
            className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-slate-50 text-[#0056b3] border-b-2 border-[#0056b3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <tab.icon className="w-4 h-4" />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* ── SECTION 1: DISPENSARY ────────────────────────────────────────────────── */}
      {activeTab === "dispensary" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-100 p-4 border border-slate-300 flex items-center justify-between">
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"/> {t("Incoming Queue")}</h2>
               <span className="text-[9px] font-black bg-white border border-slate-300 px-2 py-0.5">{rxList.length} {t("New")}</span>
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
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t("No Active Requisitions")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Processing Detail */}
          <div className="lg:col-span-2">
            {!selectedRx ? (
              <div className="h-full bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <LayoutDashboard className="w-16 h-16 mb-4 opacity-10" />
                <h3 className="text-xl font-black uppercase tracking-tighter">{t("Selection Required")}</h3>
                <p className="text-xs font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">{t("Select an incoming digital prescription from the queue to initiate dispensation workflow.")}</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none font-black text-6xl transform rotate-12">{t("DISPENSARY")}</div>
                
                {/* Rx Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{t("Medical Prescription")}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">{t("Authenticated Digital Order • Patient Ref")}: P-{selectedRx.patient_id}</p>
                  </div>
                  <button onClick={() => setSelectedRx(null)} className="p-2 hover:bg-white/10 transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8 border-b border-slate-100 pb-8 print:hidden">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("Prescribing Clinician")}</p>
                      <p className="text-lg font-black uppercase text-slate-900">{t(selectedRx.doctor_name || selectedRx.issued_by)}</p>
                      <p className="text-[10px] font-bold text-[#0056b3] uppercase mt-0.5">{t("Verified Medical Practitioner")}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("Issue Timestamp")}</p>
                      <p className="text-sm font-bold uppercase text-slate-700">{new Date(selectedRx.issued_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  {preparingOrder ? (
                     <div className="border border-slate-200 bg-white">
                        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
                           <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3]">{t("Order Preparation Details")}</h4>
                           <button onClick={() => setPreparingOrder(false)} className="text-[9px] font-black uppercase text-slate-500 hover:text-slate-900 border border-slate-300 px-3 py-1 bg-white">{t("Cancel Prep")}</button>
                        </div>
                        <div className="divide-y divide-slate-100" id="printable-invoice">
                           <div className="hidden print:block p-8 border-b-4 border-[#0056b3]">
                               <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{t(profile?.store_name || "")}</h1>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t("Official Medical Retail Invoice")}</p>
                               <div className="mt-6 text-[10px] font-black uppercase text-slate-700 flex justify-between">
                                  <span>{t("Patient Ref")}: P-{selectedRx.patient_id}</span>
                                  <span>{t("Date")}: {new Date().toLocaleDateString()}</span>
                               </div>
                           </div>
                           {orderItems.map((item, idx) => (
                              <div key={idx} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-slate-50 transition-colors print:p-4 print:border-b">
                                 <div>
                                    <p className="text-base font-black uppercase text-slate-900">{t(item.name)}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t("Available Stock")}: {item.stock} {t("Units")}</p>
                                 </div>
                                 <div className="flex gap-6 items-center print:hidden">
                                     <div className="flex flex-col items-center">
                                         <label className="text-[8px] font-black tracking-widest text-slate-400 uppercase mb-1">{t("Dispense Amount")}</label>
                                         <div className="flex items-center border border-slate-300 bg-white shadow-inner">
                                            <button onClick={() => updateOrderItemQty(idx, item.quantity - 1)} className="px-3 py-2 text-slate-400 hover:bg-slate-100 font-bold">-</button>
                                            <input type="number" min="0" max={item.stock} value={item.quantity} onChange={(e) => updateOrderItemQty(idx, parseInt(e.target.value) || 0)} className="w-12 py-2 text-center font-black outline-none bg-transparent" />
                                            <button onClick={() => updateOrderItemQty(idx, item.quantity + 1)} className="px-3 py-2 text-slate-400 hover:bg-slate-100 font-bold">+</button>
                                         </div>
                                     </div>
                                     <div className="text-right w-24">
                                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">{t("Subtotal")}</p>
                                         <p className="text-base font-black text-[#0056b3]">₹{item.price * item.quantity}</p>
                                     </div>
                                 </div>
                                 <div className="hidden print:block text-right">
                                     <p className="text-[10px] font-black uppercase text-slate-500">{t("Qty")}: {item.quantity}</p>
                                     <p className="text-base font-black text-slate-900 mt-1">₹{item.price * item.quantity}</p>
                                 </div>
                              </div>
                           ))}
                           <div className="bg-slate-50 print:bg-white p-6 border-t-2 border-slate-200 flex justify-between items-center print:mt-4">
                              <div>
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t("Total Order Billed")}</p>
                                 <div className="flex items-center text-4xl font-black text-[#0056b3] tracking-tighter">
                                    <IndianRupee className="w-8 h-8" strokeWidth={3} />
                                    {orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)}
                                 </div>
                              </div>
                              <button onClick={printInvoice} className="print:hidden px-4 py-3 border border-slate-300 bg-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-colors">
                                  <FileText className="w-4 h-4" /> {t("Save Invoice PDF")}
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <>
                        <div className="print:hidden">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4 flex items-center gap-2">
                             <Pill className="w-4 h-4" /> {t("Itemized Medication Request")}
                          </h4>
                          <div className="divide-y-2 divide-slate-50 border-y border-slate-100">
                            {selectedRx.medicines.map((item, id) => {
                              const match = inventory.find(m => m.name.toLowerCase() === item.medicine.toLowerCase());
                              const isAvail = match && match.stock > 0;
                              return (
                              <div key={id} className="py-5 flex justify-between group">
                                <div>
                                  <div className="flex items-center gap-2">
                                     <p className="text-base font-black uppercase text-slate-900">{t(item.medicine)}</p>
                                     <span className="text-[9px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 tracking-widest">X{t(item.duration || "Course")}</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-wide">{t(item.dosage)} • {t(item.notes)}</p>
                                </div>
                                <div className="text-right space-y-2">
                                   <p className="text-sm font-black text-slate-900">₹{match?.price || "—"}</p>
                                   <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border inline-block shadow-sm ${isAvail ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                       {isAvail ? t("AVAILABLE IN STOCK") : t("OUT OF STOCK")}
                                   </div>
                                </div>
                              </div>
                            )})}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-6 border-l-8 border-[#0056b3] flex justify-between items-center group print:hidden">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t("Est. Dispensation Cost")}</p>
                            <div className="flex items-center text-4xl font-black text-[#0056b3] tracking-tighter">
                               <IndianRupee className="w-8 h-8" strokeWidth={3} />
                               {calculateBill(selectedRx.medicines)}
                            </div>
                          </div>
                          <div className="hidden md:block opacity-10 transition-opacity">
                             <FileText className="w-12 h-12" />
                          </div>
                        </div>
                     </>
                  )}

                  <div className="flex flex-col md:flex-row gap-3 pt-6 print:hidden">
                    {selectedRx.status === "pending" ? (
                      <>
                        <button onClick={() => handleUpdateStatus(selectedRx.id, "accepted")} disabled={processingStatus} className="flex-1 py-4 bg-[#0056b3] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-blue-800 transition-all flex justify-center items-center gap-2">
                           {processingStatus ? <Loader2 className="animate-spin w-4 h-4"/> : t("Accept Prescription")}
                        </button>
                        <button onClick={() => handleUpdateStatus(selectedRx.id, "rejected")} disabled={processingStatus} className="px-8 py-4 bg-white border-2 border-red-600 text-red-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-red-50 transition-all">
                           {t("Reject - Out of Stock")}
                        </button>
                      </>
                    ) : preparingOrder ? (
                        <button onClick={finalizeDispensation} disabled={processingStatus} className="flex-1 py-4 bg-green-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-green-700 hover:shadow-2xl transition-all flex justify-center items-center gap-2">
                           {processingStatus ? <Loader2 className="animate-spin w-4 h-4"/> : <CheckCircle2 className="w-5 h-5"/>}
                           {t("Process Bill & Commit Dispensation")}
                        </button>
                    ) : (
                        <button onClick={startOrderPrep} className="flex-1 py-4 bg-yellow-400 text-slate-900 font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:shadow-xl hover:bg-yellow-500 transition-all flex justify-center items-center gap-2 border border-yellow-500">
                           <LayoutDashboard className="w-5 h-5"/>
                           {t("Prepare Order System")}
                        </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
