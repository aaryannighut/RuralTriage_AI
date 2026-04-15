import { useState } from "react";
import { User, Stethoscope, Pill, ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ─── Shared field components ───────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, required = false,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 mb-1.5 font-sans">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <input
        type={type} required={required} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-sm outline-none text-sm text-slate-900 bg-white font-sans focus:border-[#0056b3] focus:ring-1 focus:ring-[#0056b3] placeholder:text-slate-500 transition-none"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 mb-1.5 font-sans">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <select
        required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-sm outline-none text-sm text-slate-900 bg-white font-sans focus:border-[#0056b3] focus:ring-1 focus:ring-[#0056b3] transition-none"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Role config ────────────────────────────────────────────────────────────

type Role = "patient" | "doctor" | "pharmacy";
type SignupStep = "role" | "credentials" | "profile";

const ROLES: { id: Role; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { id: "patient",  label: "Patient",        subtitle: "Track your health & consult doctors",  icon: <User className="w-5 h-5 text-[#0056b3]" /> },
  { id: "doctor",   label: "Doctor",         subtitle: "Manage patients & consultations",       icon: <Stethoscope className="w-5 h-5 text-[#0056b3]" /> },
  { id: "pharmacy", label: "Pharmacy Admin", subtitle: "Manage medicine inventory",             icon: <Pill className="w-5 h-5 text-[#0056b3]" /> },
];

// ─── Main component ─────────────────────────────────────────────────────────

interface SwasthyaAuthProps { onClose?: () => void }

export default function SwasthyaAuth({ onClose }: SwasthyaAuthProps = {}) {
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // login
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // signup – step machine
  const [signupStep, setSignupStep]     = useState<SignupStep>("role");
  const [selectedRole, setSelectedRole] = useState<Role>("patient");

  const [creds, setCreds] = useState({ name: "", email: "", password: "" });

  const [patientP, setPatientP] = useState({
    age: "", gender: "", phone: "", blood_group: "", height: "", weight: "",
  });
  const [doctorP, setDoctorP] = useState({
    phone: "", qualification: "", specialty: "",
    experience: "", fee: "", hospital: "", city: "", state: "",
  });
  const [pharmacyP, setPharmacyP] = useState({
    phone: "", store_name: "", degree: "", license_number: "",
    address: "", city: "", state: "", pincode: "", opening_hours: "",
  });

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetSignup = () => {
    setSignupStep("role");
    setSelectedRole("patient");
    setCreds({ name: "", email: "", password: "" });
    setPatientP({ age: "", gender: "", phone: "", blood_group: "", height: "", weight: "" });
    setDoctorP({ phone: "", qualification: "", specialty: "", experience: "", fee: "", hospital: "", city: "", state: "" });
    setPharmacyP({ phone: "", store_name: "", degree: "", license_number: "", address: "", city: "", state: "", pincode: "", opening_hours: "" });
    setError(""); setSuccess("");
  };

  const switchTab = (tab: "login" | "signup") => {
    setActiveTab(tab); setError(""); setSuccess("");
    if (tab === "signup") resetSignup();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res  = await fetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginData) });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Login failed"); return; }
      setSuccess(`Welcome back, ${data.name}!`);
      login({ name: data.name, email: data.email, phone: "", role: data.role ?? "patient", userId: data.id });
      setTimeout(() => onClose?.(), 900);
    } catch { setError("Could not reach the server. Is the backend running?"); }
    finally   { setLoading(false); }
  };

  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (creds.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSignupStep("profile");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const authRes  = await fetch("/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...creds, role: selectedRole }) });
      const authData = await authRes.json();
      if (!authRes.ok) { setError(authData.detail ?? "Signup failed"); return; }

      if (selectedRole === "patient") {
        const { height, weight, ...rest } = patientP;
        await fetch("/patients/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:        creds.name,
            user_id:     authData.id,
            age:         rest.age         ? parseInt(rest.age)           : null,
            gender:      rest.gender      || null,
            phone:       rest.phone       || null,
            blood_group: rest.blood_group || null,
            health_metrics: {
              ...(height ? { height: parseFloat(height) } : {}),
              ...(weight ? { weight: parseFloat(weight) } : {}),
            },
          }),
        });
      } else if (selectedRole === "doctor") {
        await fetch("/doctors/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             name:          creds.name,
             email:         creds.email,
             qualification: doctorP.qualification,
             specialty:     doctorP.specialty,
             experience:    doctorP.experience ? parseInt(doctorP.experience) : 0,
             fee:           doctorP.fee        ? parseFloat(doctorP.fee)      : 0,
             hospital:      doctorP.hospital,
             city:          doctorP.city,
             state:         doctorP.state,
             phone:         doctorP.phone,
          }),
        });
      } else if (selectedRole === "pharmacy") {
        await fetch("/pharmacies/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id:         authData.id,
            pharmacist_name: creds.name,
            store_name:      pharmacyP.store_name,
            degree:          pharmacyP.degree,
            license_number:  pharmacyP.license_number,
            phone:           pharmacyP.phone,
            email:           creds.email,
            address:         pharmacyP.address,
            city:            pharmacyP.city,
            state:           pharmacyP.state,
            pincode:         pharmacyP.pincode,
            opening_hours:   pharmacyP.opening_hours,
          }),
        });
      }

      setSuccess(`Account created! Welcome, ${authData.name} `);
      login({ name: authData.name, email: authData.email, phone: selectedRole === "pharmacy" ? pharmacyP.phone : "", role: selectedRole, userId: authData.id });
      setTimeout(() => onClose?.(), 1400);
    } catch { setError("Could not reach the server. Is the backend running?"); }
    finally   { setLoading(false); }
  };

  const heading = activeTab === "login" ? "Login to Portal"
    : signupStep === "role"        ? "Register on RuralTriage AI"
    : signupStep === "credentials" ? "Account Credentials"
    : "Profile Details";

  const RoleBadge = ({ onBack }: { onBack: () => void }) => (
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-300">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 bg-transparent ">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="px-2 py-1 bg-[#e6f2ff] text-[#0056b3] border border-blue-200 rounded-sm text-xs font-bold uppercase">
        {selectedRole}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white border border-slate-300 shadow-sm p-6 sm:p-8 rounded-sm text-slate-900">
      <div className="flex flex-col items-center mb-6">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mb-2" />
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{heading}</h2>
      </div>

      <div className="flex mb-6 bg-slate-100 p-1 border border-slate-300 rounded-sm">
        {(["login", "signup"] as const).map((tab) => (
          <button key={tab} onClick={() => switchTab(tab)}
            className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-sm transition-none ${
              activeTab === tab
                ? "bg-[#0056b3] text-white"
                : "bg-transparent text-slate-600 hover:bg-slate-200"
            }`}>
            {tab === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {success && <div className="mb-4 px-3 py-2 bg-[#e8f5e9] border border-green-300 rounded-sm text-sm text-green-900">✓ {success}</div>}
      {error && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-300 rounded-sm text-sm text-red-900">{error}</div>}

      {/* LOGIN */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Field label="Email ID" type="email" value={loginData.email} onChange={(v) => setLoginData({ ...loginData, email: v })} placeholder="user@example.com" required />
          <Field label="Password" type="password" value={loginData.password} onChange={(v) => setLoginData({ ...loginData, password: v })} placeholder="Password" required />
          <button type="submit" disabled={loading}
            className="mt-4 w-full py-2.5 bg-[#0056b3] hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-sm text-md font-bold uppercase tracking-wider border border-transparent focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
            {loading ? "Authenticating..." : "Login securely"}
          </button>
        </form>
      )}

      {/* SIGNUP 1 */}
      {activeTab === "signup" && signupStep === "role" && (
        <div className="flex flex-col gap-3">
          {ROLES.map((r) => (
            <button key={r.id} type="button"
              onClick={() => { setSelectedRole(r.id); setSignupStep("credentials"); setError(""); }}
              className="flex items-center gap-4 p-4 border border-slate-300 rounded-sm hover:bg-[#e6f2ff] hover:border-[#0056b3] transition-none text-left">
              <div className="w-10 h-10 rounded-sm bg-[#e6f2ff] border border-blue-200 flex items-center justify-center shrink-0">
                {r.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900 uppercase tracking-wide">{r.label}</div>
                <div className="text-xs text-slate-600 mt-1">{r.subtitle}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </div>
      )}

      {/* SIGNUP 2 */}
      {activeTab === "signup" && signupStep === "credentials" && (
        <form onSubmit={handleCredentialsNext} className="flex flex-col gap-4">
          <RoleBadge onBack={() => setSignupStep("role")} />
          <Field label="Full Name (As per ID)" type="text" value={creds.name} onChange={(v) => setCreds({ ...creds, name: v })} placeholder="Aadhaar Name" required />
          <Field label="Email ID" type="email" value={creds.email} onChange={(v) => setCreds({ ...creds, email: v })} placeholder="Official Email" required />
          <Field label="Password" type="password" value={creds.password} onChange={(v) => setCreds({ ...creds, password: v })} placeholder="Min 6 Characters" required />
          <button type="submit"
            className="mt-4 w-full py-2.5 bg-[#0056b3] hover:bg-blue-800 text-white rounded-sm text-md font-bold uppercase tracking-wider border border-transparent">
            Continue
          </button>
        </form>
      )}

      {/* SIGNUP 3 */}
      {activeTab === "signup" && signupStep === "profile" && (
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <RoleBadge onBack={() => setSignupStep("credentials")} />

          {selectedRole === "patient" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age" type="number" value={patientP.age} onChange={(v) => setPatientP({ ...patientP, age: v })} placeholder="Age" />
                <SelectField label="Gender" value={patientP.gender} onChange={(v) => setPatientP({ ...patientP, gender: v })} options={["Male", "Female", "Other"]} />
              </div>
              <Field label="Mobile Number" type="tel" value={patientP.phone} onChange={(v) => setPatientP({ ...patientP, phone: v })} placeholder="10-digit number" />
              <SelectField label="Blood Group" value={patientP.blood_group} onChange={(v) => setPatientP({ ...patientP, blood_group: v })} options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} />
            </>
          )}

          {selectedRole === "doctor" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qualification" type="text" value={doctorP.qualification} onChange={(v) => setDoctorP({ ...doctorP, qualification: v })} placeholder="MBBS" required />
                <Field label="Specialty" type="text" value={doctorP.specialty} onChange={(v) => setDoctorP({ ...doctorP, specialty: v })} placeholder="General" required />
              </div>
              <Field label="Mobile Number" type="tel" value={doctorP.phone} onChange={(v) => setDoctorP({ ...doctorP, phone: v })} placeholder="10-digit number" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Exp (Years)" type="number" value={doctorP.experience} onChange={(v) => setDoctorP({ ...doctorP, experience: v })} placeholder="5" />
                <Field label="Reg. Fee (₹)" type="number" value={doctorP.fee} onChange={(v) => setDoctorP({ ...doctorP, fee: v })} placeholder="0" />
              </div>
              <Field label="Facility Name" type="text" value={doctorP.hospital} onChange={(v) => setDoctorP({ ...doctorP, hospital: v })} placeholder="Hospital/Clinic" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="District" type="text" value={doctorP.city} onChange={(v) => setDoctorP({ ...doctorP, city: v })} placeholder="City" />
                <Field label="State" type="text" value={doctorP.state} onChange={(v) => setDoctorP({ ...doctorP, state: v })} placeholder="State" />
              </div>
            </>
          )}

          {selectedRole === "pharmacy" && (
            <>
              <Field label="Mobile Number" type="tel" value={pharmacyP.phone} onChange={(v) => setPharmacyP({ ...pharmacyP, phone: v })} placeholder="10-digit number" required />
              <Field label="Facility Name" type="text" value={pharmacyP.store_name} onChange={(v) => setPharmacyP({ ...pharmacyP, store_name: v })} placeholder="Store Name" required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qualification" type="text" value={pharmacyP.degree} onChange={(v) => setPharmacyP({ ...pharmacyP, degree: v })} placeholder="B.Pharm" required />
                <Field label="License No." type="text" value={pharmacyP.license_number} onChange={(v) => setPharmacyP({ ...pharmacyP, license_number: v })} placeholder="Reg No." required />
              </div>
              <Field label="Facility Address" type="text" value={pharmacyP.address} onChange={(v) => setPharmacyP({ ...pharmacyP, address: v })} placeholder="Full Address" required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="District" type="text" value={pharmacyP.city} onChange={(v) => setPharmacyP({ ...pharmacyP, city: v })} placeholder="City" required />
                <Field label="State" type="text" value={pharmacyP.state} onChange={(v) => setPharmacyP({ ...pharmacyP, state: v })} placeholder="State" required />
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="mt-4 w-full py-2.5 bg-[#0056b3] hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-sm text-md font-bold uppercase tracking-wider border border-transparent">
            {loading ? "Registering..." : "Submit Registration"}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
        Secured by Government Standards Policy.
      </div>
    </div>
  );
}
