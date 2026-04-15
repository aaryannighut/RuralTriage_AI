import { useState } from "react";
import { User, Phone, Mail, LogOut, Check, Pencil, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface UserProfileProps {
  onClose: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: form.name, phone: form.phone });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  // Initials avatar
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="w-full text-[#1E293B]">
      {/* Top accent bar */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[3px] rounded-b-[4px] bg-gradient-to-r from-[#4F7DF3] via-[#A7E3C9] to-[#FFD6A5]" />

      {/* Avatar + name */}
      <div className="text-center mb-6 pt-1">
        <div className="w-16 h-16 rounded-md bg-[#4F7DF3] flex items-center justify-center mx-auto shadow-[0_4px_12px_rgba(79,125,243,0.35)] text-white text-xl font-bold">
          {initials}
        </div>
        <h2 className="mt-3 text-[1.2rem] font-semibold text-[#1E293B] font-sans">
          {user.name || "Your Profile"}
        </h2>
        <p className="text-[0.82rem] text-[#64748B] font-sans mt-0.5">{user.email}</p>
      </div>

      {/* Saved banner */}
      {saved && (
        <div className="mb-4 px-4 py-3 bg-[#A7E3C9]/30 border border-[#A7E3C9] rounded-md text-[0.85rem] text-[#1E293B] font-sans flex items-center gap-2">
          <Check className="w-4 h-4 text-[#4F7DF3]" />
          Profile updated successfully.
        </div>
      )}

      {/* Read view */}
      {!editing && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] rounded-md border border-[rgba(0,0,0,0.06)]">
            <User className="w-4 h-4 text-[#4F7DF3] shrink-0" />
            <div>
              <p className="text-[0.72rem] text-[#64748B] font-sans">Full Name</p>
              <p className="text-[0.9rem] font-medium text-[#1E293B] font-sans">
                {user.name || <span className="text-[#64748B] italic">Not set</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] rounded-md border border-[rgba(0,0,0,0.06)]">
            <Mail className="w-4 h-4 text-[#4F7DF3] shrink-0" />
            <div>
              <p className="text-[0.72rem] text-[#64748B] font-sans">Email Address</p>
              <p className="text-[0.9rem] font-medium text-[#1E293B] font-sans">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-[#F8FAFC] rounded-md border border-[rgba(0,0,0,0.06)]">
            <Phone className="w-4 h-4 text-[#4F7DF3] shrink-0" />
            <div>
              <p className="text-[0.72rem] text-[#64748B] font-sans">Phone Number</p>
              <p className="text-[0.9rem] font-medium text-[#1E293B] font-sans">
                {user.phone || <span className="text-[#64748B] italic">Not set</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => { 
                onClose(); 
                if (user.role === "doctor") navigate("/dashboard/doctor");
                else if (user.role === "pharmacy") navigate("/dashboard/pharmacist");
                else navigate("/");
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-[#4F7DF3] text-white hover:bg-[#3D6DE3] transition-colors text-[0.9rem] font-semibold font-sans cursor-pointer shadow-[0_2px_10px_rgba(79,125,243,0.3)]"
          >
            <LayoutDashboard className="w-4 h-4" />
            My Health Dashboard
          </button>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-[#4F7DF3] text-[#4F7DF3] hover:bg-[#4F7DF3] hover:text-white transition-colors text-[0.9rem] font-semibold font-sans cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#1E293B] mb-1.5 font-sans">
              Full Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              className="w-full px-3.5 py-2.5 border-[1.5px] border-[rgba(0,0,0,0.1)] rounded-md outline-none text-[0.9rem] text-[#1E293B] bg-white font-sans transition-all duration-200 focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 placeholder:text-[#64748B]"
            />
          </div>
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#1E293B] mb-1.5 font-sans">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 border-[1.5px] border-[rgba(0,0,0,0.1)] rounded-md outline-none text-[0.9rem] text-[#1E293B] bg-white font-sans transition-all duration-200 focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 placeholder:text-[#64748B]"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-full border border-[rgba(0,0,0,0.1)] text-[#64748B] hover:bg-[#F8FAFC] transition-colors text-[0.9rem] font-semibold font-sans cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#4F7DF3] hover:bg-[#3D6DE3] text-white border-none rounded-full text-[0.9rem] font-bold font-sans cursor-pointer transition-all duration-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-[#d4183d]/30 text-[#d4183d] hover:bg-[#d4183d]/5 transition-colors text-[0.9rem] font-semibold font-sans cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </div>
  );
}
