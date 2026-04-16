import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Video, Phone, MessageCircle, Calendar, Clock, User,
  Mic, MicOff, VideoOff, PhoneOff, Loader2, Wifi, WifiOff, Copy, Check as CheckIcon,
  X, ShieldCheck, History, Search, Heart, UserPlus, ShieldAlert
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { toWsUrl, toApiUrl } from "../config/runtime";

const SIGNAL_WS_BASE = toWsUrl("/ws/signal");

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { 
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];

type CallStatus = "connecting" | "waiting" | "connected" | "failed" | "ended";

interface LogEntry {
    time: string;
    msg: string;
    type: "info" | "error" | "success";
}

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

const AVAIL_CONFIG: Record<string, { label: string; cls: string }> = {
  Available: { label: "Available", cls: "bg-green-600 text-white border-green-700" },
  Busy:      { label: "Busy",      cls: "bg-yellow-600 text-white border-yellow-700" },
  "On Leave":{ label: "Off Duty",  cls: "bg-red-600 text-white border-red-700" },
};

function VideoCallRoom({
  roomId,
  doctorName,
  onEnd,
}: {
  roomId: string;
  doctorName: string;
  onEnd: () => void;
}) {
  const { t } = useLanguage();
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef    = useRef<RTCPeerConnection | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const roleRef  = useRef<"initiator" | "receiver" | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const [status, setStatus]   = useState<CallStatus>("connecting");
  const [micOn,  setMicOn]    = useState(true);
  const [camOn,  setCamOn]    = useState(true);
  const [copied, setCopied]   = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const addLog = useCallback((msg: string, type: "info" | "error" | "success" = "info") => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-15), { time, msg, type }]);
  }, []);

  const endCall = useCallback(() => {
    addLog(t("Consultation concluded"), "info");
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    onEnd();
  }, [onEnd, addLog]);

  useEffect(() => {
    let pc: RTCPeerConnection;
    let ws: WebSocket;

    async function start() {
      addLog(t("Initializing hardware..."), "info");
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addLog(t("Camera & Mic active"), "success");
      } catch (err) {
        addLog(t("Hardware access restricted"), "error");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          addLog(t("Mic active (Video failed)"), "info");
        } catch (audioErr) {
          addLog(t("All hardware blocked"), "error");
        }
      }

      if (!stream) {
        setStatus("failed");
        return;
      }
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      addLog(t("Preparing Peer Connection..."), "info");
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        addLog(t("Remote stream discovered"), "success");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStatus("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        addLog(`${t("P2P State")}: ${pc.connectionState}`, "info");
        if (pc.connectionState === "failed") {
          addLog(t("P2P Handshake failed"), "error");
          setStatus("failed");
        }
      };

      const wsUrl = `${SIGNAL_WS_BASE}/${roomId}`;
      addLog(`${t("Connecting to signal")}: ${wsUrl}`, "info");
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => addLog(t("Signaling active"), "success");

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);

        switch (msg.type) {
          case "joined":
            roleRef.current = msg.role;
            addLog(`${t("Joined as")} ${msg.role}`, "info");
            setStatus("waiting");
            if (msg.role === "receiver") {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "peer-joined":
            addLog(t("Peer detected In-Room"), "success");
            if (roleRef.current === "initiator") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
              addLog(t("SDP Offer dispatched"), "info");
            } else {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "ready":
             if (roleRef.current === "initiator" && !pc.localDescription) {
               addLog(t("Ready signal received, creating offer"), "info");
               const offer = await pc.createOffer();
               await pc.setLocalDescription(offer);
               ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
             }
             break;

          case "offer":
            addLog(t("Offer received"), "info");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: msg.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
            addLog(t("Answer dispatched"), "info");
            // Empty candidate queue
            while (candidateQueue.current.length) {
              const cand = candidateQueue.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            break;

          case "answer":
            addLog(t("Answer received"), "info");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: msg.sdp }));
            // Empty candidate queue
            while (candidateQueue.current.length) {
                const cand = candidateQueue.current.shift();
                if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            break;

          case "ice-candidate":
            if (pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore */ }
            } else {
              candidateQueue.current.push(msg.candidate);
            }
            break;

          case "peer-left":
            addLog(t("Peer disconnected"), "error");
            setStatus("ended");
            break;

          case "room-full":
            addLog(t("Room limit exceeded"), "error");
            setStatus("failed");
            break;
        }
      };

      ws.onerror = () => {
          addLog(t("Signal WS error"), "error");
          setStatus("failed");
      };
      
      ws.onclose = () => addLog(t("Signaling closed"), "info");
    }

    start().catch((err) => {
        console.error(err);
        addLog(t("Fatal setup error"), "error");
        setStatus("failed");
    });

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      pc?.close();
      ws?.close();
    };
  }, [roomId, retryCount, addLog, t]);

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(p => !p);
  };

  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(p => !p);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel: Record<CallStatus, string> = {
    connecting: t("Establishing Secure Connection..."),
    waiting:    t("Waiting for Practitioner..."),
    connected:  t("Connection Active"),
    failed:     t("Connection Failed"),
    ended:      t("Consultation Concluded"),
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col md:flex-row select-none font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center gap-4">
              <span className={`w-3 h-3 rounded-none ${
                status === "connected"  ? "bg-green-500" :
                status === "waiting" || status === "connecting" ? "bg-yellow-500" :
                "bg-red-500"
              }`} />
              <span className="text-white font-bold tracking-wide uppercase">{t(doctorName)}</span>
              <span className="text-slate-400 text-sm hidden sm:block">| {t(statusLabel[status])}</span>
            </div>
            {(status === "connecting" || status === "waiting") && (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            )}
          </div>

          <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />

            {status !== "connected" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
                <div className="w-24 h-24 bg-slate-800 border-2 border-slate-600 flex items-center justify-center mb-6">
                  {status === "failed" ? <WifiOff className="w-12 h-12 text-red-500" /> : <User className="w-12 h-12 text-slate-400" />}
                </div>
                <p className="text-white font-bold text-xl uppercase mb-2">{status === "failed" ? t("Handshake Error") : t(doctorName)}</p>
                <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider">{t(statusLabel[status])}</p>
                
                {status === "failed" ? (
                    <button 
                        onClick={() => { setRetryCount(c => c + 1); setStatus("connecting"); }}
                        className="px-8 py-3 bg-[#0056b3] text-white font-black uppercase tracking-widest hover:bg-blue-700"
                    >
                        {t("Re-establish Link")}
                    </button>
                ) : (status === "connecting" || status === "waiting") && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-600">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t("Secure Session ID")}:</span>
                    <span className="text-blue-400 font-mono text-sm">{roomId}</span>
                    <button onClick={copyRoomId} className="ml-2 text-white bg-[#0056b3] p-1.5 hover:bg-blue-700">
                      {copied ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-48 h-36 object-cover border-4 border-slate-700 bg-slate-800" />
          </div>

          <div className="flex items-center justify-center gap-6 py-6 bg-slate-800 border-t border-slate-700">
            <button onClick={toggleMic} className={`p-4 border-2 transition-all ${micOn ? "border-slate-500 bg-slate-700 text-white" : "border-red-600 bg-red-600 text-white"}`}>
              {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button onClick={toggleCam} className={`p-4 border-2 transition-all ${camOn ? "border-slate-500 bg-slate-700 text-white" : "border-red-600 bg-red-600 text-white"}`}>
              {camOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            <button onClick={endCall} className="p-4 border-2 border-red-700 bg-red-700 hover:bg-red-800 text-white transition-all">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
      </div>

      <div className="w-full md:w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
          <div className="p-4 bg-slate-800 border-b border-slate-700">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">{t("Connection Log")}</h4>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
              {logs.map((log, i) => (
                  <div key={i} className="text-[10px] flex gap-2">
                      <span className="text-slate-500 shrink-0">{log.time}</span>
                      <span className="text-slate-300">|</span>
                      <span className={`break-words ${log.type === "error" ? "text-red-400" : log.type === "success" ? "text-green-400" : "text-slate-400"}`}>
                        {log.msg} {log.type === "error" && <X className="inline w-3 h-3 ml-1" />} {log.type === "success" && <CheckIcon className="inline w-3 h-3 ml-1" />}
                      </span>
                  </div>
              ))}
              {status === "connecting" && (
                   <div className="text-[10px] text-blue-400 animate-pulse">{t("Establishing handshake...")}</div>
              )}
          </div>
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-600 uppercase font-black text-center tracking-[0.2em]">
              {t("room")}: {roomId} | {t("role")}: {t(roleRef.current || "---")}
          </div>
      </div>
    </div>
  );
}

export function TalkToDoctor() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor]     = useState<Doctor | null>(null);
  const [consultationType, setConsultationType] = useState<"video" | "audio" | "chat" | null>(null);

  const [doctors,     setDoctors]     = useState<Doctor[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [fetchError,  setFetchError]  = useState("");

  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{day: string, time: string, booked?: boolean}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const [upcomingApts, setUpcomingApts] = useState<any[]>([]);
  const [historyApts, setHistoryApts] = useState<any[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);

  const [showReschedule, setShowReschedule] = useState(false);
  const [aptToReschedule, setAptToReschedule] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [familyDocId, setFamilyDocId] = useState<number | null>(null);
  const [familyDoctor, setFamilyDoctor] = useState<Doctor | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);

  const fetchPatientData = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const res = await fetch(toApiUrl(`/patients/user/${user.userId}`));
      if (res.ok) {
        const data = await res.json();
        setPatientId(data.id);
        
        // Fetch full doctor details if family_doctor_id exists
        if (data.family_doctor_id) {
            const docRes = await fetch(toApiUrl(`/patients/${data.id}/family-doctor`));
            if (docRes.ok) {
                const docData = await docRes.json();
                setFamilyDoctor(docData.doctor);
                setFamilyDocId(data.family_doctor_id);
            }
        } else {
            setFamilyDoctor(null);
            setFamilyDocId(null);
        }
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    }
  }, [user?.userId]);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    setLoadingApts(true);
    try {
      const [upRes, histRes] = await Promise.all([
        fetch(toApiUrl(`/appointments/upcoming/${patientId}`)),
        fetch(toApiUrl(`/appointments/history/${patientId}`))
      ]);
      if (upRes.ok) setUpcomingApts(await upRes.json());
      if (histRes.ok) setHistoryApts(await histRes.json());
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoadingApts(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAppointments();
    fetchPatientData();
  }, [fetchAppointments, fetchPatientData]);

  useEffect(() => {
    const url = searchQuery ? `/doctors/search?query=${searchQuery}` : "/doctors/";
    setLoadingDocs(true);
    fetch(toApiUrl(url))
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json() as Promise<Doctor[]>;
      })
      .then((data) => {
         setDoctors(data);
      })
      .catch((err) => setFetchError(err.message ?? t("Failed to load doctors")))
      .finally(() => setLoadingDocs(false));
  }, [searchQuery]);

  const openBooking = async (docOverride?: Doctor) => {
    const doc = docOverride || selectedDoctor;
    if (!doc) return;
    
    if (docOverride) setSelectedDoctor(docOverride);
    
    setShowBooking(true);
    setLoadingSlots(true);
    setBookingError("");
    try {
      const res = await fetch(toApiUrl(`/doctors/${doc.id}/available-slots`));
      if (!res.ok) throw new Error(t("Failed to load available slots"));
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : t("Could not load slots"));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !bookingDate || !bookingTime || !user.name) {
      setBookingError(t("Please fill in all mandatory fields."));
      return;
    }
    
    try {
      const res = await fetch(toApiUrl(`/appointments/create`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId || 0,
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.name,
          specialty: selectedDoctor.specialty,
          date: bookingDate,
          time: bookingTime,
          notes: bookingNotes,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? t("Booking failed"));
      }
      
      setBookingSuccess(t(`Requisition Dispatched. Track progress in the registry below.`));
      setShowBooking(false);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      fetchAppointments();
      setTimeout(() => setBookingSuccess(""), 4000);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : t("Booking failed"));
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm(t("CONFIRMATION REQUIRED: Are you sure you wish to decommission this appointment?"))) return;
    try {
      const res = await fetch(toApiUrl(`/appointments/cancel/${id}`), { method: "PUT" });
      if (res.ok) fetchAppointments();
    } catch (err) {
      console.error("Cancel Failure:", err);
    }
  };

  const handleReschedule = async () => {
    if (!aptToReschedule || !bookingDate || !bookingTime) return;
    try {
      const res = await fetch(toApiUrl(`/appointments/reschedule/${aptToReschedule.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_date: bookingDate, new_time: bookingTime }),
      });
      if (res.ok) {
        setShowReschedule(false);
        setAptToReschedule(null);
        fetchAppointments();
      }
    } catch (err) {
      console.error("Reschedule Failure:", err);
    }
  };

  const handleSetFamilyDoctor = async (docId: number) => {
    let currentPatientId = patientId;
    const activeUserId = user?.userId || (user as any)?.id;
    
    if (!currentPatientId && activeUserId) {
      try {
        const res = await fetch(toApiUrl(`/patients/user/${activeUserId}`));
        if (res.ok) {
          const data = await res.json();
          currentPatientId = data.id;
          setPatientId(data.id);
        }
      } catch (err) {
        console.error("Registry Sync Failure:", err);
      }
    }

    if (!currentPatientId) {
      alert(t("CRITICAL ERROR: Patient synchronization failed."));
      return;
    }

    try {
      const isUpdate = !!familyDocId;
      const apiPath = isUpdate ? "/patients/change-family-doctor" : "/patients/set-family-doctor";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(toApiUrl(apiPath), {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: currentPatientId, doctor_id: docId }),
      });
      
      if (res.ok) {
        setFamilyDocId(docId);
        const found = doctors.find(d => d.id === docId);
        if (found) setFamilyDoctor(found);
        else {
           // Fetch full doctor details if not in list
           const dRes = await fetch(`/doctors/${docId}`);
           if (dRes.ok) setFamilyDoctor(await dRes.json());
        }
        
        // Notify the doctor
        await fetch(toApiUrl("/doctor/notification"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            doctor_id: docId, 
            message: `New patient assigned: ${user.name}` 
          }),
        });

        alert(t("FAMILY DOCTOR ASSIGNED: Profile updated successfully."));
      } else {
        const errData = await res.json();
        alert(`${t("Registry Update Failed")}: ${errData.detail || t("Unknown error")}`);
      }
    } catch (err) {
      console.error("Transmutation Failure:", err);
      alert(t("Network Error: Failed to commit selection."));
    }
  };

  const handleRemoveFamilyDoctor = async () => {
    if (!patientId) return;
    if (!window.confirm(t("Are you sure you want to remove your family doctor?"))) return;

    try {
      const res = await fetch(toApiUrl(`/patients/remove-family-doctor/${patientId}`), {
        method: "DELETE",
      });
      if (res.ok) {
        setFamilyDocId(null);
        setFamilyDoctor(null);
        alert(t("Family doctor removed."));
      }
    } catch (err) {
      console.error("Removal Failure:", err);
    }
  };
  if (!user.userId) return (
    <div className="w-full max-w-4xl mx-auto p-6 mt-12 bg-red-50 border border-red-300 flex items-center flex-col text-center">
       <ShieldAlert className="w-12 h-12 text-red-700 mb-3" />
       <h2 className="text-xl font-bold text-red-900 uppercase">{t("Unauthorized Access")}</h2>
       <p className="text-red-800 font-semibold mt-2">{t("Authentication required for clinical tele-consultations.")}</p>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      
      {/* --- DASHBOARD: UPCOMING APPOINTMENTS --- */}
      {upcomingApts.length > 0 && (
        <div className="border border-slate-300 bg-white shadow-sm transition-all">
          <div className="p-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
             <h2 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
               <Calendar className="w-5 h-5 text-[#0056b3]" /> {t("Upcoming Appointments")}
             </h2>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2 py-0.5 border border-slate-300">{t("Registry Active")}</span>
          </div>
          <div className="p-4 sm:p-6">
            {loadingApts ? (
              <div className="py-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#0056b3]" /> {t("Updating Schedule...")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingApts.map(apt => (
                  <div key={apt.id} className="border border-slate-300 bg-white flex flex-col hover:border-[#0056b3] transition-colors group">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#0056b3]" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm uppercase leading-tight">{t(apt.doctor_name || "Practitioner")}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t(apt.specialty)}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-tighter">{t("Scheduled")}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tighter">{apt.date}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tighter">{apt.time}</span>
                      </div>
                    </div>
                    <div className="mt-auto border-t border-slate-100 p-2 grid grid-cols-3 gap-2 bg-slate-50/50">
                      <button 
                        onClick={() => navigate(`/test-call?room=room-${apt.id}`)}
                        className="py-2 bg-[#0056b3] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-none flex items-center justify-center gap-2"
                      >
                        <Video className="w-3 h-3" /> {t("Join")}
                      </button>
                      <button 
                        onClick={() => { setAptToReschedule(apt); setBookingDate(apt.date); setBookingTime(apt.time); setShowReschedule(true); }}
                        className="py-2 border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-none flex items-center justify-center gap-2"
                      >
                        <Clock className="w-3 h-3 text-blue-600" /> {t("Date")}
                      </button>
                      <button 
                        onClick={() => handleCancel(apt.id)}
                        className="py-2 border border-red-300 bg-white text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-none flex items-center justify-center gap-2"
                      >
                        <X className="w-3 h-3 text-red-600" /> {t("Cancel")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Advisory */}
      <div className="bg-[#fff9e6] border border-yellow-200 px-4 py-3 flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-yellow-700 shrink-0" />
        <div className="text-xs text-slate-800 font-bold uppercase">
          <span className="text-red-700 mr-2">{t("NOTICE")}:</span> {t("Maintain strict adherence to scheduled time slots. Failure to join within 5 minutes may result in case decommissioning.")}
        </div>
      </div>

      {/* --- SECTION: YOUR FAMILY DOCTOR --- */}
      {familyDoctor && (
        <div className="border border-[#0056b3] bg-[#f0f7ff]">
          <div className="p-4 bg-[#0056b3] flex items-center justify-between">
             <h2 className="font-black text-white uppercase tracking-tighter flex items-center gap-2">
               <Heart className="w-5 h-5 fill-white" /> {t("Your Primary Family Doctor")}
             </h2>
             <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-blue-800 px-2 py-0.5 border border-white/20">{t("Dedicated Access")}</span>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white border border-slate-300 flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 text-[#0056b3]" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="font-black text-slate-900 text-xl uppercase tracking-tight flex items-center gap-3">
                {t(familyDoctor.name)}
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter border shadow-sm ${AVAIL_CONFIG[familyDoctor.availability]?.cls || "bg-slate-200 text-slate-700 border-slate-300"}`}>
                  {t(AVAIL_CONFIG[familyDoctor.availability]?.label || familyDoctor.availability)}
                </span>
              </div>
              <div className="text-sm font-bold text-[#0056b3] uppercase tracking-widest">{t(familyDoctor.specialty)} • {familyDoctor.experience} {t("Years Experience")}</div>
              <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-tighter">{t("Certified Regional Health Guardian")}</p>
            </div>
            <div className="flex gap-3">
                <button 
                  onClick={() => { setConsultationType("video"); openBooking(familyDoctor); }}
                  className="px-8 py-3 bg-[#0056b3] text-white text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-none shadow-md"
                >
                  {t("Consult Now")}
                </button>
                <button 
                  onClick={() => { document.getElementById('doctor-registry')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-6 py-3 border-2 border-slate-300 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-none"
                >
                  {t("Change Doctor")}
                </button>
                <button 
                  onClick={handleRemoveFamilyDoctor}
                  className="px-6 py-3 border-2 border-red-300 bg-white text-red-700 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-none"
                >
                  {t("Remove Doctor")}
                </button>
            </div>
          </div>
        </div>
      )}

      <div id="doctor-registry" className="border border-slate-300 bg-white">
        <div className="p-6 md:p-8 border-b border-slate-300 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{t("Tele-Consultation Registry")}</h1>
            <p className="text-slate-600 mt-1">{t("Connect with authorized regional health practitioners securely.")}</p>
          </div>
          <div className="flex flex-wrap text-sm border border-slate-300 bg-white rounded-sm overflow-hidden">
            <button
               onClick={() => { setConsultationType("video"); setSelectedDoctor(null); }}
               className={`px-4 py-2 font-bold uppercase transition-none ${consultationType === "video" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >{t("Video Link")}</button>
            <button
               onClick={() => { setConsultationType("audio"); setSelectedDoctor(null); }}
               className={`px-4 py-2 font-bold uppercase border-l border-slate-300 transition-none ${consultationType === "audio" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >{t("Audio Voice")}</button>
            <button
               onClick={() => navigate("/test-chat")}
               className={`px-4 py-2 font-bold uppercase border-l border-slate-300 transition-none ${consultationType === "chat" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >{t("Text Chat")}</button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {consultationType === "video" && !selectedDoctor && (
            <div className="mb-6 p-4 border border-[#0056b3] bg-[#e6f2ff] flex justify-between items-center text-[#0056b3]">
              <span className="font-bold text-sm uppercase tracking-wider">{t("Emergency Standby Consultation")}</span>
               <button
                onClick={() => navigate(`/test-call?room=room-${Date.now()}`)}
                className="px-6 py-2 bg-[#0056b3] text-white text-sm font-bold uppercase hover:bg-blue-800 transition-none border border-transparent focus:ring-2 focus:ring-[#0056b3]"
              >
                {t("Launch Now")}
              </button>
            </div>
          )}

          {bookingSuccess && (
            <div className="mb-6 px-4 py-3 bg-[#e8f5e9] border border-green-300 text-green-900 text-sm font-bold uppercase tracking-wider">
               {bookingSuccess}
            </div>
          )}

          {/* --- DOCTOR SEARCH BAR --- */}
          <div className="mb-8 p-4 bg-slate-100 border-2 border-slate-200 relative group overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#0056b3]"></div>
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">{t("Smart Registry Filter")}</label>
             <div className="relative">
                <input 
                  type="text"
                  placeholder={t("Search practitioners by name or specialization (MBBS, MD, Cardio...)")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-300 text-sm font-bold placeholder:text-slate-400 focus:border-[#0056b3] focus:ring-0 outline-none transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#0056b3]" />
             </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center justify-between">
             <span>{consultationType ? t(`Authorized Providers (${consultationType})`) : t("General Regional Directory")}</span>
             {searchQuery && <span className="text-[10px] text-slate-400">{t("Filtering active records...")}</span>}
          </h2>

          {loadingDocs && (
            <div className="p-10 border border-slate-300 text-center text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-5 h-5 animate-spin" /> {t("Fetching Master List...")}
            </div>
          )}

          {!loadingDocs && fetchError && (
            <div className="p-6 border border-red-300 bg-red-50 text-red-800 font-bold uppercase tracking-wider text-sm">
              {t("Critical Error")}: {fetchError}
            </div>
          )}

          {!loadingDocs && !fetchError && doctors.length === 0 && (
            <div className="p-10 border border-slate-300 text-center text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
              {t("No registered practitioners available current roster.")}
            </div>
          )}

          {!loadingDocs && !fetchError && doctors.length > 0 && (
            <div className="border border-slate-300 rounded-sm overflow-hidden">
               {/* Government Directory Style Table for large screens, stacked for small */}
               <table className="w-full text-left text-sm text-slate-700 hidden md:table">
                 <thead className="bg-slate-100 border-b border-slate-300 text-slate-900 uppercase">
                   <tr>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">{t("Practitioner Name")}</th>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">{t("Specialty")}</th>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">{t("Status")}</th>
                     <th className="px-4 py-3 font-bold">{t("Action")}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-300">
                   {doctors.map(doc => (
                     <tr key={doc.id} className={selectedDoctor?.id === doc.id ? "bg-[#e6f2ff]" : "hover:bg-slate-50"}>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                          <div className="font-bold text-slate-900">{t(doc.name)}</div>
                          <div className="text-xs text-slate-500 mt-1">{t(doc.qualification || "Unspecified Credentials")}</div>
                       </td>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                          <div className="font-semibold text-slate-900">{t(doc.specialty)}</div>
                          <div className="text-xs text-slate-500 mt-1">{doc.experience} {t("Years Exp.")} | {t("Reg Fee")}: ₹{doc.fee}</div>
                       </td>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                           <span className={`px-2 py-1 text-[10px] font-black uppercase border shadow-sm ${AVAIL_CONFIG[doc.availability]?.cls || "bg-slate-200 text-slate-700 border-slate-300"}`}>
                             {t(AVAIL_CONFIG[doc.availability]?.label || doc.availability)}
                           </span>
                           {doc.verified && <div className="mt-2 text-blue-700 text-xs font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> {t("CERTIFIED")}</div>}
                        </td>
                       <td className="px-4 py-4 align-top">
                         <div className="flex flex-col gap-2">
                           <button
                             onClick={() => { setSelectedDoctor(doc); setShowBooking(false); }}
                             className={`px-4 py-2 w-full text-xs font-bold uppercase border transition-none ${selectedDoctor?.id === doc.id ? "bg-[#0056b3] text-white border-[#0056b3]" : "bg-white text-[#0056b3] border-[#0056b3] hover:bg-[#e6f2ff]"}`}
                           >{t("Select")}</button>
                           <button
                             onClick={() => handleSetFamilyDoctor(doc.id)}
                             disabled={familyDocId === doc.id}
                             className={`px-4 py-2 w-full text-[10px] font-black uppercase transition-none flex items-center justify-center gap-2 ${familyDocId === doc.id ? "bg-slate-200 text-slate-500 border border-slate-300" : "bg-white text-green-700 border border-green-300 hover:bg-green-50"}`}
                           >
                             <Heart className={`w-3 h-3 ${familyDocId === doc.id ? "fill-slate-400 text-slate-400" : "fill-green-700 text-green-700"}`} /> {familyDocId === doc.id ? t("Primary Guardian") : t("Set Family Doctor")}
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>

               <div className="md:hidden divide-y divide-slate-300">
                  {doctors.map(doc => (
                     <div key={doc.id} className={`p-4 ${selectedDoctor?.id === doc.id ? "bg-[#e6f2ff]" : "bg-white"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-slate-900 text-base">{t(doc.name)}</div>
                          <span className={`px-2 py-1 text-[10px] font-black uppercase border shadow-sm ${AVAIL_CONFIG[doc.availability]?.cls || "bg-slate-200 text-slate-700 border-slate-300"}`}>
                            {t(AVAIL_CONFIG[doc.availability]?.label || doc.availability)}
                          </span>
                        </div>
                        <div className="text-sm font-semibold">{t(doc.specialty)}</div>
                        <div className="text-xs text-slate-500 mt-1 mb-3">{t(doc.qualification || "Unspecified")} | {doc.experience} {t("Yrs")} | ₹{doc.fee}</div>
                        <div className="flex flex-col gap-2">
                           <button
                             onClick={() => { setSelectedDoctor(doc); setShowBooking(false); }}
                             className={`px-4 py-2 w-full text-xs font-bold uppercase border transition-none ${selectedDoctor?.id === doc.id ? "bg-[#0056b3] text-white border-[#0056b3]" : "bg-white text-[#0056b3] border-[#0056b3] hover:bg-[#e6f2ff]"}`}
                           >{t("Select")}</button>
                           <button
                             onClick={() => handleSetFamilyDoctor(doc.id)}
                             disabled={familyDocId === doc.id}
                             className={`px-4 py-2 w-full text-[10px] font-black uppercase transition-none flex items-center justify-center gap-2 ${familyDocId === doc.id ? "bg-slate-200 text-slate-500 border border-slate-300" : "bg-white text-green-700 border border-green-300 hover:bg-green-50"}`}
                           >
                             <Heart className={`w-3 h-3 ${familyDocId === doc.id ? "fill-slate-400 text-slate-400" : "fill-green-700 text-green-700"}`} /> {familyDocId === doc.id ? t("Primary Guardian") : t("Set Family Doctor")}
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* Action Pane after selecting doc */}
          {selectedDoctor && (
             <div className="mt-8 p-6 bg-slate-100 border border-slate-300">
               <h3 className="font-bold text-slate-900 uppercase mb-4 border-b border-slate-300 pb-2">{t("Actions for")} {selectedDoctor.name}</h3>
               <div className="flex flex-wrap gap-4">
                  <button
                    onClick={openBooking}
                    className="px-6 py-3 bg-[#0056b3] text-white text-sm font-bold uppercase hover:bg-blue-800 transition-none flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" /> {t("Schedule Visit")}
                  </button>
                  {consultationType === "audio" && (
                    <button
                      onClick={() => alert(t(`Direct audio routing currently inactive due to line stability.`))}
                      className="px-6 py-3 bg-white text-[#0056b3] border border-[#0056b3] text-sm font-bold uppercase hover:bg-[#e6f2ff] transition-none flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" /> {t("Request Direct Voice")}
                    </button>
                   )}
               </div>
             </div>
          )}
        </div>
      </div>

      {showBooking && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-400 w-full max-w-lg shadow-2xl">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-300 flex items-center justify-between">
               <h2 className="font-bold text-slate-900 uppercase">{t("Consultation Requisition")}</h2>
               <button onClick={() => setShowBooking(false)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleBookAppointment(); }} className="p-6 space-y-4 bg-white">
              <div className="p-3 bg-slate-50 border border-slate-300 mb-2">
                <p className="text-sm"><strong>{t("Subject")}:</strong> {selectedDoctor.name} ({t(selectedDoctor.specialty)})</p>
                <p className="text-sm text-slate-600"><strong>{t("Fee Code")}:</strong> {t("Standard Registry")} (₹{selectedDoctor.fee})</p>
              </div>

              {bookingError && <div className="p-3 border border-red-300 bg-red-50 text-red-800 text-sm font-bold uppercase">{bookingError}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">{t("Appointment Date")} *</label>
                <input
                  required
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-sm focus:border-[#0056b3] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">{t("Select Slot")} *</label>
                {loadingSlots ? (
                  <div className="py-4 text-center text-sm font-bold text-[#0056b3] uppercase">{t("Querying Grid...")}</div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-4 text-center text-sm font-bold text-slate-500 uppercase">{t("Availability Blocked")}</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={`${slot.day}_${slot.time}`}
                        type="button"
                        onClick={() => setBookingTime(slot.time)}
                        disabled={slot.booked}
                        className={`px-3 py-2 text-sm border font-bold uppercase transition-none ${slot.booked ? "bg-slate-200 border-slate-300 text-slate-400" : bookingTime === slot.time ? "bg-[#0056b3] border-[#0056b3] text-white" : "bg-white border-slate-300 text-slate-700 hover:border-[#0056b3]"}`}
                      >
                         {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">{t("Preliminary Notes")}</label>
                <textarea
                   value={bookingNotes}
                   onChange={e => setBookingNotes(e.target.value)}
                   className="w-full px-3 py-2 border border-slate-300 bg-white text-sm focus:border-[#0056b3] outline-none resize-none"
                   rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowBooking(false)} className="flex-1 py-2 border border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100 transition-none">{t("Cancel")}</button>
                <button type="submit" disabled={!bookingDate || !bookingTime} className="flex-1 py-2 bg-[#0056b3] text-white font-bold uppercase hover:bg-blue-800 transition-none disabled:opacity-50">{t("Transmit Request")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESCHEDULE MODAL --- */}
      {showReschedule && aptToReschedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white border-2 border-slate-900 w-full max-w-sm shadow-2xl">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-white uppercase text-sm tracking-widest">{t("Reschedule Order")}</h2>
              <button onClick={() => setShowReschedule(false)} className="text-white hover:text-red-400 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleReschedule(); }} className="p-6 space-y-5">
              <div className="p-4 bg-slate-100 border border-slate-300 space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Patient File")}</p>
                <p className="text-sm font-bold text-slate-900 uppercase underline decoration-[#0056b3] decoration-2">{t(aptToReschedule.doctor_name)}</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">{t("New Target Date")}</label>
                <input
                  required
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-slate-300 bg-white text-sm font-bold focus:border-[#0056b3] outline-none transition-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">{t("New Slot Assignment")}</label>
                <div className="grid grid-cols-2 gap-2">
                   {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map(t => (
                     <button
                        key={t}
                        type="button"
                        onClick={() => setBookingTime(t)}
                        className={`py-3 text-xs font-black border-2 transition-none ${bookingTime === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-300 hover:border-slate-900"}`}
                     >
                       {t}
                     </button>
                   ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowReschedule(false)} className="flex-1 py-3 border-2 border-slate-900 bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-none">{t("Abort")}</button>
                <button type="submit" disabled={!bookingDate || !bookingTime} className="flex-1 py-3 bg-[#0056b3] text-white text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-none disabled:opacity-50">{t("Confirm")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DASHBOARD: APPOINTMENT HISTORY --- */}
      <div className="border border-slate-300 bg-white">
        <div className="p-4 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
           <h2 className="font-black text-slate-600 uppercase tracking-tighter flex items-center gap-2">
             <History className="w-5 h-5" /> {t("Consultation History")}
           </h2>
           <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 uppercase tracking-widest">{t("Archive Record")}</span>
        </div>
        <div className="p-4 sm:p-6 bg-slate-50/30">
          {loadingApts ? (
            <div className="py-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t("Querying Archives...")}</div>
          ) : historyApts.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
              <span className="text-xs font-bold uppercase tracking-widest">{t("No Historical Logs Found")}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {historyApts.map(apt => (
                <div key={apt.id} className="p-4 border border-slate-200 bg-white flex flex-col gap-3 group relative grayscale hover:grayscale-0 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-tighter ${
                      apt.status === "Completed" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {t(apt.status)}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs uppercase leading-tight truncate">{t(apt.doctor_name)}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{apt.date} | {apt.time}</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="text-[9px] font-black text-[#0056b3] uppercase tracking-widest border-b border-[#0056b3]">{t("Review Report")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
