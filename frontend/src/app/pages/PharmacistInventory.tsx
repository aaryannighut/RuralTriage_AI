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

export function PharmacistInventory() {
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

  // Inventory Modal States
  const [showInvModal, setShowInvModal] = useState(false);
  const [invFormData, setInvFormData] = useState({ 
    id: null as number | null, 
    medicine_name: "", 
    quantity: "" as string | number, 
    price: "" as string | number, 
    expiry_date: "",
    brand: "",
    category: "Other" as Category,
    dose: "",
    form: "Tablet",
    manufacturer: ""
  });
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
        if (!res.ok) throw new Error(t("Failed to finalize order."));
        
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

  const handleSaveInventory = async () => {
    if (!profile) return;
    setSavingInv(true);
    try {
      const q = parseInt(invFormData.quantity.toString()) || 0;
      const p = parseFloat(invFormData.price.toString()) || 0;

      if (invFormData.id) {
         // Update
         const res = await fetch(toApiUrl(`/pharmacies/pharmacy/inventory/update/${invFormData.id}`), {
            method: "PUT",
             headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: q, price: p, expiry_date: invFormData.expiry_date })
         });
         if (!res.ok) throw new Error(t("Failed to update inventory."));
      } else {
         // Add
         const res = await fetch(toApiUrl(`/pharmacies/pharmacy/inventory/add`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                pharmacy_id: profile.id, 
                medicine_name: invFormData.medicine_name, 
                quantity: q, 
                price: p, 
                expiry_date: invFormData.expiry_date,
                brand: invFormData.brand,
                category: invFormData.category,
                dose: invFormData.dose,
                form: invFormData.form,
                manufacturer: invFormData.manufacturer
            })
         });
         if (!res.ok) throw new Error(t("Failed to add inventory."));
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
    if (!confirm(t("Are you sure you want to remove this medication from inventory?"))) return;
    try {
      const res = await fetch(toApiUrl(`/pharmacies/pharmacy/inventory/delete/${invId}`), { method: "DELETE" });
      if (!res.ok) throw new Error(t("Failed to delete inventory."));
      fetchData();
    } catch(err: any) {
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setInvFormData({ id: null, medicine_name: "", quantity: "", price: "", expiry_date: "", brand: "", category: "Other", dose: "", form: "Tablet", manufacturer: "" });
    setShowInvModal(true);
  };

  const openEditModal = (m: Medicine) => {
    setInvFormData({ id: m.id, medicine_name: m.name, quantity: m.stock, price: m.price, expiry_date: m.expiry, brand: m.brand, category: m.category, dose: m.dose, form: m.form, manufacturer: m.manufacturer });
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

      <div className="space-y-4">
           {/* Controls */}
           <div className="bg-white border border-slate-300 p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
              <div className="relative flex-1 w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" placeholder={t("QUERY INVENTORY REGISTRY...")} value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 text-xs font-black uppercase outline-none focus:border-[#0056b3] transition-all"
                 />
              </div>
              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
                 <button onClick={() => setFilterLowStock(!filterLowStock)} className={`px-4 py-3 border text-[10px] font-black uppercase tracking-widest transition-all ${filterLowStock ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{t("Alerts")} <span className="text-red-500 ml-1">({stats.low_stock})</span></button>
                 <button onClick={() => setFilterExpiring(!filterExpiring)} className={`px-4 py-3 border text-[10px] font-black uppercase tracking-widest transition-all ${filterExpiring ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{t("Expiring")}</button>
                 <button onClick={openAddModal} className="flex-1 md:flex-none px-6 py-3 bg-[#0056b3] text-white font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2 whitespace-nowrap hover:bg-blue-800">
                    <Plus className="w-4 h-4" /> {t("Add Medication")}
                 </button>
               </div>
           </div>

           {/* Table */}
           <div className="bg-white border-2 border-slate-900 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                       <tr>
                          <th className="px-6 py-4">{t("Clinical Naming")}</th>
                          <th className="px-6 py-4 text-center">{t("Operational Stock")}</th>
                          <th className="px-6 py-4">{t("Unit Pricing")}</th>
                          <th className="px-6 py-4">{t("Expiry")}</th>
                          <th className="px-6 py-4 text-right">{t("Actions")}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredInv.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                             <td className="px-6 py-5">
                                <div className="font-black text-slate-900 uppercase text-sm">{t(m.name)}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">{t(m.brand || "Generics")} • {t(m.form)} • {t(m.dose)}</div>
                                <div className="text-[9px] font-black text-[#0056b3] uppercase tracking-widest mt-1 opacity-60">{t(m.manufacturer)}</div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex flex-col items-center gap-1">
                                   <div className={`px-4 py-1 text-[11px] font-black border uppercase tracking-tighter ${m.stock < 10 ? "bg-red-50 text-red-600 border-red-200" : "bg-[#e8f5e9] text-green-700 border-green-200"}`}>
                                      {m.stock} {t("Units")}
                                   </div>
                                   {m.stock < 10 && <span className="text-[8px] font-black text-white bg-red-600 px-2 py-0.5 rounded-sm uppercase tracking-widest animate-pulse">{t("Low Stock")}</span>}
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
                                   <span className="text-[10px] font-black uppercase text-slate-500">{t(m.expiry || "N/A")}</span>
                                   {isExpiringSoon(m.expiry) && <span className="text-[8px] font-black text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-sm uppercase tracking-widest animate-pulse">{t("Expiring Soon")}</span>}
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

      {/* ADD/EDIT INVENTORY MODAL */}
      {showInvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-4 border-slate-900 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest">{invFormData.id ? t("Update Operational Stock") : t("Registry Add: New Medication")}</h3>
                <button onClick={() => setShowInvModal(false)} className="hover:text-red-400 transition-colors"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Clinical Designation")}</label>
                  <input type="text" value={invFormData.medicine_name} onChange={e => setInvFormData({...invFormData, medicine_name: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50 disabled:cursor-not-allowed" placeholder={t("E.g. PARACETAMOL")}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Brand Name")}</label>
                     <input type="text" value={invFormData.brand} onChange={e => setInvFormData({...invFormData, brand: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50" placeholder={t("E.g. Calpol")}/>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Drug Category")}</label>
                     <select value={invFormData.category} onChange={e => setInvFormData({...invFormData, category: e.target.value as Category})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50">
                        {CATEGORIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Dosage")}</label>
                     <input type="text" value={invFormData.dose} onChange={e => setInvFormData({...invFormData, dose: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50" placeholder={t("E.g. 500 MG")}/>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Form (Format)")}</label>
                     <select value={invFormData.form} onChange={e => setInvFormData({...invFormData, form: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50">
                        <option value="Tablet">{t("Tablet")}</option>
                        <option value="Syrup">{t("Syrup")}</option>
                        <option value="Injection">{t("Injection")}</option>
                        <option value="Capsule">{t("Capsule")}</option>
                        <option value="Ointment">{t("Ointment")}</option>
                        <option value="Drops">{t("Drops")}</option>
                        <option value="Powder">{t("Powder")}</option>
                     </select>
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Manufacturer")}</label>
                  <input type="text" value={invFormData.manufacturer} onChange={e => setInvFormData({...invFormData, manufacturer: e.target.value})} disabled={!!invFormData.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none disabled:opacity-50" placeholder={t("E.g. GSK Ltd")}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Stock Quantity")}</label>
                     <input type="number" value={invFormData.quantity} onChange={e => setInvFormData({...invFormData, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none" min="0"/>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Unit Price (₹)")}</label>
                     <input type="number" value={invFormData.price} onChange={e => setInvFormData({...invFormData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none" min="0" step="0.01"/>
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t("Expiry Horizon (YYYY-MM)")}</label>
                  <input type="month" value={invFormData.expiry_date} onChange={e => setInvFormData({...invFormData, expiry_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black uppercase focus:border-[#0056b3] outline-none"/>
                </div>
                <button onClick={handleSaveInventory} disabled={savingInv || !invFormData.medicine_name} className="w-full py-4 mt-2 bg-[#0056b3] text-white font-black uppercase tracking-widest text-xs shadow-md hover:bg-blue-800 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed">
                   {savingInv ? <Loader2 className="w-4 h-4 animate-spin"/> : t("Execute Registry Commit")}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
