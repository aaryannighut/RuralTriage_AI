import { useState, useRef } from "react";
import {
  Plus, Search, Edit2, Trash2, X, Check,
  AlertTriangle, MapPin, Phone, BadgeCheck, Stethoscope, Build, Building2,
  Clock, IndianRupee, FileCheck2, Upload, Eye
} from "lucide-react";

type Specialty =
  | "General Physician" | "Cardiologist" | "Neurologist" | "Dermatologist"
  | "Pediatrician" | "Orthopedist" | "Gynecologist" | "Ophthalmologist"
  | "ENT Specialist" | "Psychiatrist" | "Diabetologist" | "Oncologist" | "Other";

type Availability = "Available" | "Busy" | "On Leave";
type ConsultMode = "Video" | "In-Person" | "Both";

interface Doctor {
  id: number;
  name: string;
  specialty: Specialty;
  qualification: string;
  experience: number;
  fee: number;
  hospital: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  availability: Availability;
  consultMode: ConsultMode;
  verified: boolean;
  certificate: string | null;
}

const SPECIALTIES: Specialty[] = [
  "General Physician", "Cardiologist", "Neurologist", "Dermatologist",
  "Pediatrician", "Orthopedist", "Gynecologist", "Ophthalmologist",
  "ENT Specialist", "Psychiatrist", "Diabetologist", "Oncologist", "Other",
];

const availabilityStyles: Record<Availability, string> = {
  Available: "bg-[#e8f5e9] text-green-900 border-green-300",
  Busy: "bg-yellow-50 text-yellow-900 border-yellow-300",
  "On Leave": "bg-red-50 text-red-900 border-red-300",
};

const SEED: Doctor[] = [
  { id: 1, name: "Dr. Priya Sharma", specialty: "General Physician", qualification: "MBBS, MD", experience: 12, fee: 300, hospital: "City Health Clinic", city: "Pune", state: "Maharashtra", phone: "+91 98700 11111", email: "priya.sharma@rc.in", availability: "Available", consultMode: "Both", verified: true, certificate: "priya_sharma_cert.pdf" },
  { id: 2, name: "Dr. Arjun Nair", specialty: "Cardiologist", qualification: "MBBS, MD, DM Cardiology", experience: 18, fee: 800, hospital: "Heart Care Centre", city: "Mumbai", state: "Maharashtra", phone: "+91 98700 22222", email: "arjun.nair@rc.in", availability: "Busy", consultMode: "Video", verified: true, certificate: "arjun_nair_cert.pdf" },
  { id: 3, name: "Dr. Meena Patel", specialty: "Diabetologist", qualification: "MBBS, MD, Fellowship DM", experience:  9, fee: 500, hospital: "Diabetes & Wellness Clinic", city: "Ahmedabad", state: "Gujarat", phone: "+91 98700 33333", email: "meena.patel@rc.in", availability: "Available", consultMode: "Both", verified: true, certificate: "meena_patel_cert.pdf" },
];

const emptyForm = (): Omit<Doctor, "id"> => ({
  name: "", specialty: "General Physician", qualification: "", experience: 0,
  fee: 300, hospital: "", city: "", state: "", phone: "", email: "",
  availability: "Available", consultMode: "Both", verified: false, certificate: null,
});

export function DoctorAdmin() {
  const [doctors, setDoctors] = useState<Doctor[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState<"All" | Specialty>("All");
  const [filterAvail, setFilterAvail] = useState<"All" | Availability>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formInitial, setFormInitial] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const nextId = useRef(SEED.length + 1);

  const openAdd = () => { setFormInitial(emptyForm()); setEditingId(null); setModalOpen(true); };
  const openEdit = (d: Doctor) => { const { id, ...rest } = d; setFormInitial(rest); setEditingId(id); setModalOpen(true); };

  const handleSave = (e: React.FormEvent, form: Omit<Doctor, "id">) => {
    e.preventDefault();
    if (editingId !== null) {
      setDoctors(p => p.map(d => d.id === editingId ? { ...form, id: editingId } : d));
    } else {
      setDoctors(p => [...p, { ...form, id: nextId.current++ }]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteConfirm !== null) {
      setDoctors(p => p.filter(d => d.id !== deleteConfirm));
      setDeleteConfirm(null);
    }
  };

  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.city.toLowerCase().includes(q);
    const matchSpec = filterSpec === "All" || d.specialty === filterSpec;
    const matchAvail = filterAvail === "All" || d.availability === filterAvail;
    return matchSearch && matchSpec && matchAvail;
  });

  return (
    <div className="w-full space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="border border-slate-300 bg-slate-50 p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-tight">Physician Registry</h1>
           <p className="text-sm font-semibold text-slate-600 mt-1 uppercase tracking-wide">Authorized Personnel & Doctor Index</p>
        </div>
        <button onClick={openAdd} className="bg-[#0056b3] text-white px-5 py-2 font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-800 self-start">
           <Plus className="w-4 h-4"/> Add Doctor
        </button>
      </div>

      {/* Delete Dialog */}
      {deleteConfirm !== null && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white border-2 border-red-500 w-full max-w-sm">
               <div className="bg-red-500 p-3 text-white font-bold uppercase flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5"/> Terminate Record
               </div>
               <div className="p-4 font-semibold text-slate-800">
                  Are you absolutely certain you wish to purge this clinical record from the database?
               </div>
               <div className="flex border-t border-slate-300 bg-slate-50">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 p-3 font-bold uppercase tracking-wide border-r border-slate-300 hover:bg-slate-200">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 p-3 font-bold uppercase tracking-wide text-red-600 hover:bg-red-100">Purge</button>
               </div>
            </div>
         </div>
      )}

      {/* Forms Modal */}
      {modalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="bg-white border-2 border-[#0056b3] w-full max-w-3xl my-8">
               <div className="bg-[#0056b3] p-4 text-white font-bold uppercase flex justify-between items-center">
                  <span>{editingId ? "Modify Practitioner Record" : "New Practitioner Inductive Form"}</span>
                  <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 hover:text-red-300"/></button>
               </div>
               <DoctorForm initial={formInitial} onSave={(d) => handleSave(new Event("submit") as any, d)} onCancel={() => setModalOpen(false)} />
            </div>
         </div>
      )}

      {/* Filters */}
      <div className="border border-slate-300 bg-white p-4">
         <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <input 
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#0056b3] uppercase"
                  placeholder="QUERY REGISTRY..."
               />
            </div>
            <select value={filterSpec} onChange={e => setFilterSpec(e.target.value as "All" | Specialty)} className="w-full sm:w-auto p-2 border border-slate-300 bg-white text-sm focus:outline-none uppercase font-bold">
               <option value="All">All Disciplines</option>
               {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterAvail} onChange={e => setFilterAvail(e.target.value as "All" | Availability)} className="w-full sm:w-auto p-2 border border-slate-300 bg-white text-sm focus:outline-none uppercase font-bold">
               <option value="All">All Availabilities</option>
               <option>Available</option>
               <option>Busy</option>
               <option>On Leave</option>
            </select>
         </div>
      </div>

      {/* Registry Table */}
      <div className="border border-slate-300 bg-white overflow-x-auto">
         <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#e6f2ff] border-b border-slate-300">
               <tr>
                  <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Practitioner</th>
                  <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Specialty / Loc</th>
                  <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Status</th>
                  <th className="p-3 uppercase font-bold text-xs text-[#0056b3]">Fee / Cred</th>
                  <th className="p-3 uppercase font-bold text-xs text-[#0056b3] text-right">Ops</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
               {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                     <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900 text-base">{d.name} {d.verified && <BadgeCheck className="w-4 h-4 text-[#0056b3] inline" />}</div>
                        <div className="text-xs text-slate-600 font-bold uppercase mt-1">{d.qualification} • {d.experience}YRS</div>
                     </td>
                     <td className="p-3 border-r border-slate-200">
                        <span className="font-bold uppercase text-slate-700 bg-slate-200 px-2 py-0.5 text-xs inline-block mb-1">{d.specialty}</span>
                        <div className="text-xs font-semibold text-slate-600 mt-1"><Building2 className="w-3 h-3 inline pb-0.5 text-[#0056b3]"/> {d.hospital} ({d.city})</div>
                     </td>
                     <td className="p-3 border-r border-slate-200">
                        <span className={`px-2 py-1 text-[10px] font-bold border uppercase tracking-wider ${availabilityStyles[d.availability]}`}>
                          {d.availability}
                        </span>
                     </td>
                     <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">₹{d.fee}</div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 mt-1">
                           {d.certificate ? <span className="text-green-700"><FileCheck2 className="w-3 h-3 inline"/> CERT ALIVE</span> : <span className="text-red-600">UNAPPROVED</span>}
                        </div>
                     </td>
                     <td className="p-3 text-right">
                        <button onClick={() => openEdit(d)} className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 inline-block mr-2 font-bold uppercase text-[10px]">EDIT</button>
                        <button onClick={() => setDeleteConfirm(d.id)} className="p-2 border border-red-300 hover:bg-red-50 text-red-600 inline-block font-bold uppercase text-[10px]">RM</button>
                     </td>
                  </tr>
               ))}
               {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-bold uppercase">No records match query.</td></tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}

// ── Shared Subcomponents ──────────────────────────────────────────────────────

function DoctorForm({ initial, onSave, onCancel }: { initial: Omit<Doctor, "id">, onSave: (d: Omit<Doctor, "id">) => void, onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const f = <K extends keyof Omit<Doctor, "id">>(k: K, v: Omit<Doctor, "id">[K]) => setForm(p => ({ ...p, [k]: v }));
  const ic = "w-full p-2 border border-slate-300 text-sm focus:outline-none focus:border-[#0056b3] uppercase";
  const lc = "block text-xs font-bold text-slate-700 uppercase mb-1";

  return (
    <form onSubmit={() => onSave(form)} className="p-0">
      <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lc}>Legal Name *</label><input required value={form.name} onChange={e => f("name", e.target.value)} className={ic} /></div>
            <div><label className={lc}>Qualification *</label><input required value={form.qualification} onChange={e => f("qualification", e.target.value)} className={ic} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
               <label className={lc}>Primary Discipline</label>
               <select required value={form.specialty} onChange={e => f("specialty", e.target.value as Specialty)} className={ic}>
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
               </select>
            </div>
            <div><label className={lc}>Yrs Exp</label><input required type="number" value={form.experience} onChange={e => f("experience", Number(e.target.value))} className={ic} /></div>
            <div><label className={lc}>Fee (₹)</label><input required type="number" value={form.fee} onChange={e => f("fee", Number(e.target.value))} className={ic} /></div>
          </div>

          <div className="border-t border-slate-300 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lc}>City *</label><input required value={form.city} onChange={e => f("city", e.target.value)} className={ic} /></div>
            <div><label className={lc}>State *</label><input required value={form.state} onChange={e => f("state", e.target.value)} className={ic} /></div>
          </div>
          <div><label className={lc}>Base Hospital/Clinic *</label><input required value={form.hospital} onChange={e => f("hospital", e.target.value)} className={ic} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lc}>Contact Tel *</label><input required type="tel" value={form.phone} onChange={e => f("phone", e.target.value)} className={ic} /></div>
            <div><label className={lc}>Routing Email *</label><input required type="email" value={form.email} onChange={e => f("email", e.target.value)} className={ic} /></div>
          </div>

          <div className="border-t border-slate-300 pt-4 grid grid-cols-2 gap-4">
            <div>
               <label className={lc}>Current Status</label>
               <select value={form.availability} onChange={e => f("availability", e.target.value as Availability)} className={ic}>
                 <option>Available</option><option>Busy</option><option>On Leave</option>
               </select>
            </div>
            <div>
               <label className={lc}>Modality</label>
               <select value={form.consultMode} onChange={e => f("consultMode", e.target.value as ConsultMode)} className={ic}>
                 <option>Both</option><option>Video</option><option>In-Person</option>
               </select>
            </div>
          </div>

          <div className="border border-slate-300 p-4 bg-slate-50 flex items-center justify-between">
             <div className="font-bold text-sm uppercase">Mark as Formally Verified</div>
             <input type="checkbox" checked={form.verified} onChange={e => f("verified", e.target.checked)} className="w-5 h-5 accent-[#0056b3]" />
          </div>
      </div>
      
      <div className="bg-slate-100 border-t border-slate-300 p-4 flex gap-4">
         <button type="button" onClick={onCancel} className="flex-1 p-3 bg-white border border-slate-300 text-slate-800 font-bold uppercase hover:bg-slate-50">Abort</button>
         <button type="submit" className="flex-1 p-3 bg-[#0056b3] text-white font-bold uppercase hover:bg-blue-800">Commit Record</button>
      </div>
    </form>
  )
}
