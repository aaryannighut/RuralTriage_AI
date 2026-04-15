import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  Plus, Search, Edit2, Trash2, X, Package, ShieldAlert, Pill, 
  Loader2, AlertCircle, MapPin, Phone, Building2, TrendingUp, ClipboardList, Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface IncomingPrescription {
  id: number; patient_id: number; patient_name: string;
  doctor_id: number; issued_by: string; issued_at: string;
  items: { medicine: string; dosage: string; duration: string; notes: string }[];
  general_notes?: string; ai_clinical_note?: string;
}

// ── Page Section Wrapper ──────────────────────────────────────────────────────
function PageSection({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-300 bg-white shadow-sm mt-6">
      <div className="w-full p-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-left">
        <h2 className="font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2 text-sm">
          <span className="text-[#0056b3]">{icon}</span>
          {title}
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-white border border-slate-300 text-[9px] font-black uppercase text-[#0056b3]">{badge}</span>
          )}
        </h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

type Category = "Diabetes" | "Cholesterol" | "Blood Pressure" | "Antibiotic" | "Pain Relief" | "Supplement" | "Cardiac" | "Thyroid" | "Antacid" | "Other";
type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface Medicine {
  id: number; name: string; brand: string; category: Category; dose: string; form: string; price: number; stock: number; min_stock: number; manufacturer: string; expiry: string; prescription_required: boolean;
}

interface PharmacyProfile {
  id: number; user_id: number; pharmacist_name: string; store_name: string; degree: string; license_number: string; phone: string; email: string; address: string; city: string; state: string; pincode: string; opening_hours: string; verified: boolean;
}

function getStockStatusStyle(stock: number, min: number) {
  if (stock === 0) return "bg-red-50 text-red-900 border-red-300";
  if (stock <= min) return "bg-yellow-50 text-yellow-900 border-yellow-300";
  return "bg-[#e8f5e9] text-green-900 border-green-300";
}

function getStockStatusStr(stock: number, min: number): StockStatus {
  if (stock === 0) return "Out of Stock";
  if (stock <= min) return "Low Stock";
  return "In Stock";
}

const CATEGORIES: Category[] = [
  "Diabetes", "Cholesterol", "Blood Pressure", "Antibiotic", "Pain Relief", "Supplement", "Cardiac", "Thyroid", "Antacid", "Other",
];

export function PharmacistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [rxList, setRxList] = useState<IncomingPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"All" | Category>("All");
  const [rxOpen, setRxOpen] = useState(true);
  
  const [openSection, setOpenSection] = useState<string>("dispensary");
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace("#", "");
      if (['inventory'].includes(sectionId)) {
        setOpenSection(sectionId);
      }
    } else {
      setOpenSection("dispensary");
    }
  }, [location.hash]);

  useEffect(() => {
    if (!user.userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Pharmacy Profile
        const profRes = await fetch(`/pharmacies/user/${user.userId}`);
        if (!profRes.ok) throw new Error("Dispensation registry not found.");
        const profData = await profRes.json();
        setProfile(profData);

        // 2. Fetch Inventory
        const invRes = await fetch(`/pharmacies/${profData.id}/inventory`);
        if (invRes.ok) {
          const invData = await invRes.json();
          const mapped = invData.map((inv: any) => ({ ...inv.medicine, stock: inv.quantity_available }));
          setInventory(mapped);
        }

        // 3. Fetch all incoming prescriptions
        const prescRes = await fetch("/pharmacies/prescriptions");
        if (prescRes.ok) setRxList(await prescRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Logistics synchronization failure.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.userId]);

  const filtered = inventory.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q);
    const matchCat = filterCategory === "All" || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStockCount = inventory.filter(m => m.stock <= m.min_stock).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#0056b3]" />
        <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Accessing Dispensary Logistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-900 max-w-2xl mx-auto mt-12">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h2 className="font-bold uppercase">Authorization Error</h2>
        </div>
        <p className="text-sm font-semibold">{error}</p>
        <button onClick={() => navigate("/")} className="mt-6 px-6 py-2 bg-red-900 text-white font-bold uppercase text-xs">Return to Hub</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans pb-20 text-slate-900">
      
      {/* Header section */}
      <div className="bg-slate-50 border border-slate-300 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white border border-slate-300 flex items-center justify-center shadow-sm">
            <Building2 className="w-10 h-10 text-[#0056b3]" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{profile?.store_name}</h1>
            <p className="text-xs font-bold text-[#0056b3] uppercase tracking-widest mt-1">Dispensation Auth: {profile?.license_number}</p>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-600 uppercase">
              <MapPin className="w-3 h-3 text-[#0056b3]" />
              {profile?.address}, {profile?.city}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-right border-r border-slate-300 pr-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</div>
              <div className="font-bold uppercase text-sm mt-1">{profile?.pharmacist_name}</div>
           </div>
           <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certification</div>
              <div className="px-2 py-0.5 bg-[#e8f5e9] text-green-900 border border-green-200 text-[10px] font-black uppercase tracking-widest mt-1">VERIFIED</div>
           </div>
        </div>
      </div>

      {openSection === "dispensary" && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-300 p-6 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SKU Count</div>
                <div className="text-3xl font-black mt-1">{inventory.length}</div>
              </div>
              <Package className="w-8 h-8 text-slate-200" />
            </div>
            <div className={`bg-white border p-6 flex items-center justify-between ${lowStockCount > 0 ? "border-red-300 bg-red-50/30" : "border-slate-300"}`}>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requisition Alerts</div>
                <div className={`text-3xl font-black mt-1 ${lowStockCount > 0 ? "text-red-600" : "text-slate-900"}`}>{lowStockCount}</div>
              </div>
              <AlertCircle className={`w-8 h-8 ${lowStockCount > 0 ? "text-red-400" : "text-slate-200"}`} />
            </div>
            <div className="bg-white border border-slate-300 p-6 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Availability</div>
                <div className="text-3xl font-black mt-1 text-green-600">ACTIVE</div>
              </div>
              <TrendingUp className="w-8 h-8 text-slate-200" />
            </div>
          </div>

          {/* Incoming Prescriptions from Doctors */}
          <PageSection title="Pending Prescriptions" icon={<ClipboardList className="w-5 h-5" />} badge={`${rxList.length} received`}>
            {rxList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest">
                No prescriptions received yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {rxList.map((rx, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="font-bold uppercase text-sm truncate">{rx.patient_name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                          {rx.issued_at
                            ? new Date(rx.issued_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}{" "}• {rx.issued_by}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 text-[9px] font-black uppercase shrink-0">Rx Pending</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(rx.items || []).map((item, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2 py-1 bg-[#e6f2ff] border border-blue-200 text-[10px] font-bold uppercase text-[#0056b3]">
                          <Pill className="w-3 h-3" />
                          {item.medicine} {item.dosage}{item.duration ? ` × ${item.duration}` : ""}
                        </span>
                      ))}
                    </div>
                    {rx.general_notes && (
                      <div className="mt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2 uppercase">
                        📋 {rx.general_notes}
                      </div>
                    )}
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
        </>
      )}

      {/* Inventory Control */}
      {openSection === "inventory" && (
        <PageSection title="Medication Inventory Pool" icon={<Pill className="w-5 h-5" />}>
          <div className="border-b border-slate-300 p-4 bg-white flex justify-end">
            <button className="px-6 py-2.5 bg-[#0056b3] text-white font-black uppercase tracking-widest text-xs hover:bg-blue-800 flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Add Nomenclature
            </button>
          </div>

        <div className="bg-white border border-slate-300">
           <div className="p-4 bg-slate-100 border-b border-slate-300 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-xs font-bold uppercase outline-none focus:border-[#0056b3] transition-all"
                   placeholder="Search Master Manifest..."
                 />
              </div>
              <select 
                value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)}
                className="px-4 py-2 border border-slate-300 bg-white text-xs font-bold uppercase outline-none focus:border-[#0056b3]"
              >
                 <option value="All">All Disciplines</option>
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                   <tr>
                      <th className="px-6 py-4">Item Identifier</th>
                      <th className="px-6 py-4 text-center">Current Stock</th>
                      <th className="px-6 py-4">Pricing</th>
                      <th className="px-6 py-4 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                   {filtered.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 group">
                        <td className="px-6 py-4">
                           <div className="font-bold text-slate-900 uppercase">{m.name}</div>
                           <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5 tracking-wider">{m.brand} • {m.form}</div>
                           {m.prescription_required && <div className="mt-1 text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1 inline-block uppercase italic">Rx Required</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`px-3 py-1 font-black text-[10px] border uppercase tracking-[0.1em] ${getStockStatusStyle(m.stock, m.min_stock)}`}>
                              {getStockStatusStr(m.stock, m.min_stock)}: {m.stock}
                           </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">₹{m.price}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 border border-slate-300 bg-white hover:bg-slate-100 transition-none"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="p-2 border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-none"><Trash2 className="w-3.5 h-3.5" /></button>
                           </div>
                        </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      </PageSection>
      )}

    </div>
  );
}
