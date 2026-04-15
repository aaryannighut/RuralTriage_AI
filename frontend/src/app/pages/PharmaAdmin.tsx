import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, X, Package, ShieldAlert, Pill, Stethoscope, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Category = "Diabetes" | "Cholesterol" | "Blood Pressure" | "Antibiotic" | "Pain Relief" | "Supplement" | "Cardiac" | "Thyroid" | "Antacid" | "Other";
type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface Medicine {
  id: number; name: string; brand: string; category: Category; dose: string; form: string; price: number; stock: number; min_stock: number; manufacturer: string; expiry: string; prescription_required: boolean;
}

interface PharmacyProfile {
  id?: number; user_id?: number; pharmacist_name: string; store_name: string; degree: string; license_number: string; phone: string; email: string; address: string; city: string; state: string; pincode: string; opening_hours: string; verified: boolean;
}

const CATEGORIES: Category[] = [
  "Diabetes", "Cholesterol", "Blood Pressure", "Antibiotic", "Pain Relief", "Supplement", "Cardiac", "Thyroid", "Antacid", "Other",
];

const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Drops", "Cream", "Gel", "Lotion", "Ointment", "Suspension", "Solution", "Inhaler", "Powder", "Soap", "Granules", "Other"];

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

const emptyForm = (): Omit<Medicine, "id"> => ({
  name: "", brand: "", category: "Other", dose: "", form: "Tablet", price: 0, stock: 0, min_stock: 20, manufacturer: "", expiry: "", prescription_required: false,
});

export function PharmaAdmin() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"All" | Category>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      if (!user.userId) { setProfileLoading(false); return; }
      setProfileLoading(true);
      try {
        const res = await fetch(`/pharmacies/?user_id=${user.userId}`);
        if (!res.ok) throw new Error("Load fail");
        const data = await res.json();
        if (!cancelled && data.length > 0) setPharmacyProfile(data[0]);
      } catch {
        // Handle err
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => { cancelled = true; };
  }, [user.userId]);

  useEffect(() => {
    let cancelled = false;
    const loadMedicines = async () => {
       if (!pharmacyProfile?.id) { setLoading(false); return; }
       setLoading(true);
       try {
         const res = await fetch(`/pharmacies/${pharmacyProfile.id}/inventory`);
         if (!res.ok) throw new Error("fail");
         const data = await res.json();
         const mapped = data.map((inv: any) => ({ ...inv.medicine, stock: inv.quantity_available }));
         if (!cancelled) setMedicines(mapped);
       } catch {
         // handle
       } finally {
         if (!cancelled) setLoading(false);
       }
    };
    loadMedicines();
    return () => { cancelled = true; };
  }, [pharmacyProfile?.id, addOpen, editingMedicine, deleteConfirm]);

  const handleAddStock = async (m: Omit<Medicine, "id">) => {
     // Mocking handle for flat UI tests
     setAddOpen(false);
  };

  const filtered = medicines.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q);
    const matchCat = filterCategory === "All" || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  if (user.role !== "pharmacy") {
    return (
      <div className="p-12 text-center bg-red-50 border border-red-300 mt-12 max-w-4xl mx-auto flex flex-col items-center">
        <ShieldAlert className="w-12 h-12 text-red-700 mb-4" />
        <h1 className="text-xl font-bold uppercase text-red-900">Facility Access Denied</h1>
        <p className="text-sm font-semibold mt-2">Log in with Pharmacy privileges to manage dispensary stock.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="border border-slate-300 bg-slate-50 p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-tight">Dispensary Logistics</h1>
           <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wide">Facility: {pharmacyProfile?.store_name || "UNREGISTERED"}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="bg-[#0056b3] text-white px-5 py-2 font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-800 self-start border border-[#0056b3]">
           <Plus className="w-4 h-4"/> Log Incoming
        </button>
      </div>

      {/* Forms Modal (Add/Edit logic stubbed for brevity since it's same structure) */}
      {addOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white border-2 border-[#0056b3] w-full max-w-2xl">
               <div className="bg-[#0056b3] text-white p-4 font-bold uppercase flex justify-between">
                  <span>Requisition Registration (Mock)</span>
                  <button onClick={() => setAddOpen(false)}><X className="w-5 h-5"/></button>
               </div>
               <div className="p-12 text-center text-slate-500 font-bold uppercase">
                  (Modal UI Flattened: Connect backend mutation form here)
               </div>
               <div className="bg-slate-100 p-4 mt-4 border-t border-slate-300 flex justify-end">
                  <button onClick={() => setAddOpen(false)} className="px-6 py-2 bg-white border border-slate-300 text-slate-900 font-bold uppercase">Close</button>
               </div>
            </div>
         </div>
      )}

      {/* Tools Filter */}
      <div className="border border-slate-300 bg-white p-4 flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
               value={search} onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0056b3] uppercase"
               placeholder="SEARCH NOMENCLATURE..."
            />
         </div>
         <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as Category | "All")} className="p-2 border border-slate-300 bg-white text-sm focus:outline-none uppercase font-bold w-full sm:w-auto">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
         </select>
      </div>

      {/* Datagrid */}
      <div className="border border-slate-300 bg-white overflow-x-auto">
         {loading ? (
            <div className="p-12 text-center text-[#0056b3] font-bold uppercase flex justify-center gap-2 items-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Verifying Manifest...
            </div>
         ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-[#e6f2ff] border-b border-slate-300 hidden sm:table-header-group">
                  <tr>
                     <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Item Identifier</th>
                     <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Category</th>
                     <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Stock Lvl</th>
                     <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Pricing</th>
                     <th className="p-3 uppercase font-bold text-xs text-[#0056b3] text-right">Ops</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-300 block sm:table-row-group">
                  {filtered.map(m => (
                     <tr key={m.id} className="hover:bg-slate-50 block sm:table-row border-b border-slate-300 sm:border-0">
                        <td className="p-3 border-r border-slate-200 block sm:table-cell">
                           <div className="font-bold text-slate-900 text-base">{m.name}</div>
                           <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 opacity-80">{m.brand} • {m.form}</div>
                           {m.prescription_required && <div className="text-[10px] text-red-600 font-bold uppercase mt-1">Rx REQ</div>}
                        </td>
                        <td className="p-3 border-r border-slate-200 block sm:table-cell">
                           <span className="font-bold uppercase tracking-wide text-slate-700 bg-slate-200 px-2 py-0.5 text-xs inline-block mb-1">{m.category}</span>
                        </td>
                        <td className="p-3 border-r border-slate-200 block sm:table-cell">
                           <span className={`px-2 py-1 text-[10px] font-bold border uppercase tracking-wider ${getStockStatusStyle(m.stock, m.min_stock)}`}>
                             {getStockStatusStr(m.stock, m.min_stock)}: {m.stock}
                           </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 block sm:table-cell">
                           <div className="font-bold text-slate-900">₹{m.price}</div>
                        </td>
                        <td className="p-3 text-right block sm:table-cell">
                           <button className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 inline-block mr-2 font-bold uppercase text-[10px]">EDIT</button>
                           <button className="p-2 border border-red-300 hover:bg-red-50 text-red-600 inline-block font-bold uppercase text-[10px]">RM</button>
                        </td>
                     </tr>
                  ))}
                  {filtered.length === 0 && (
                     <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-bold uppercase">No records found.</td></tr>
                  )}
               </tbody>
            </table>
         )}
      </div>

    </div>
  );
}
