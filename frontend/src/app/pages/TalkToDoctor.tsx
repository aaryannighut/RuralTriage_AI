import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Video, Phone, MessageCircle, Calendar, Clock, User,
  Mic, MicOff, VideoOff, PhoneOff, Loader2, Wifi, WifiOff, Copy, Check as CheckIcon,
  X, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toWsUrl } from "../config/runtime";

const SIGNAL_WS_BASE = toWsUrl("/ws/signal");
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type CallStatus = "connecting" | "waiting" | "connected" | "failed" | "ended";

interface Doctor {
  id: number;
  name: string;
  qualification: string;
  specialty: string;
  experience: number;
  fee: number;
  hospital: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  availability: string;
  consult_mode: string;
  verified: boolean;
  time_slots?: any[];
  appointments?: any[];
}

function VideoCallRoom({
  roomId,
  doctorName,
  onEnd,
}: {
  roomId: string;
  doctorName: string;
  onEnd: () => void;
}) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef    = useRef<RTCPeerConnection | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const roleRef  = useRef<"initiator" | "receiver" | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus]   = useState<CallStatus>("connecting");
  const [micOn,  setMicOn]    = useState(true);
  const [camOn,  setCamOn]    = useState(true);
  const [copied, setCopied]   = useState(false);

  const endCall = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    onEnd();
  }, [onEnd]);

  useEffect(() => {
    let pc: RTCPeerConnection;
    let ws: WebSocket;

    async function start() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.warn("Camera failed, falling back to audio only", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr) {
          console.error("Audio also failed", audioErr);
        }
      }

      if (!stream) {
        setStatus("failed");
        return;
      }
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
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
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("failed");
        }
      };

      ws = new WebSocket(`${SIGNAL_WS_BASE}/${roomId}`);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);

        switch (msg.type) {
          case "joined":
            roleRef.current = msg.role;
            setStatus("waiting");
            if (msg.role === "receiver") {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "peer-joined":
            if (roleRef.current === "initiator") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
            } else {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "ready":
            if (roleRef.current === "initiator" && !pc.localDescription) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
            }
            break;

          case "offer":
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: msg.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
            break;

          case "answer":
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: msg.sdp }));
            break;

          case "ice-candidate":
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore */ }
            break;

          case "peer-left":
            setStatus("ended");
            break;

          case "room-full":
            setStatus("failed");
            break;
        }
      };

      ws.onerror = () => setStatus("failed");
    }

    start().catch(() => setStatus("failed"));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      pc?.close();
      ws?.close();
    };
  }, [roomId]);

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
    connecting: "Establishing Secure Connection...",
    waiting:    "Waiting for Practitioner...",
    connected:  "Connection Active",
    failed:     "Connection Failed",
    ended:      "Consultation Concluded",
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col select-none font-sans">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-4">
          <span className={`w-3 h-3 rounded-none ${
            status === "connected"  ? "bg-green-500" :
            status === "waiting" || status === "connecting" ? "bg-yellow-500" :
            "bg-red-500"
          }`} />
          <span className="text-white font-bold tracking-wide uppercase">{doctorName}</span>
          <span className="text-slate-300 text-sm hidden sm:block">| {statusLabel[status]}</span>
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
              <User className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-white font-bold text-xl uppercase mb-2">{doctorName}</p>
            <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider">{statusLabel[status]}</p>
            
            {(status === "connecting" || status === "waiting") && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-600">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Secure Session ID:</span>
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
        <button onClick={toggleMic} className={`p-4 border-2 ${micOn ? "border-slate-500 bg-slate-700 text-white" : "border-red-600 bg-red-600 text-white"}`}>
          {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button onClick={toggleCam} className={`p-4 border-2 ${camOn ? "border-slate-500 bg-slate-700 text-white" : "border-red-600 bg-red-600 text-white"}`}>
          {camOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        <button onClick={endCall} className="p-4 border-2 border-red-700 bg-red-700 hover:bg-red-800 text-white">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export function TalkToDoctor() {
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

  useEffect(() => {
    fetch("/doctors/")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json() as Promise<Doctor[]>;
      })
      .then((data) => setDoctors(data))
      .catch((err) => setFetchError(err.message ?? "Failed to load doctors"))
      .finally(() => setLoadingDocs(false));
  }, []);

  const openBooking = async () => {
    if (!selectedDoctor) return;
    setShowBooking(true);
    setLoadingSlots(true);
    setBookingError("");
    try {
      const res = await fetch(`/doctors/${selectedDoctor.id}/available-slots`);
      if (!res.ok) throw new Error("Failed to load available slots");
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not load slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !bookingDate || !bookingTime || !user.name) {
      setBookingError("Please fill in all mandatory fields.");
      return;
    }
    
    try {
      const res = await fetch(`/doctors/${selectedDoctor.id}/book-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user.userId || 0,
          patient_name: user.name,
          appointment_date: bookingDate,
          time_slot: bookingTime,
          notes: bookingNotes,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Booking failed");
      }
      
      setBookingSuccess(`Case Registered. Your consultation with ${selectedDoctor.name} is booked.`);
      setShowBooking(false);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setTimeout(() => setBookingSuccess(""), 4000);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Official Advisory */}
      <div className="bg-[#e6f2ff] border border-blue-200 px-4 py-3 flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[#0056b3] shrink-0" />
        <div className="text-sm text-slate-800">
          <span className="font-bold uppercase tracking-wider">Tele-Consultation Directives:</span> Verify the credentials of the doctor via the certified badge. Select an appropriate triage methodology prior to booking.
        </div>
      </div>

      <div className="border border-slate-300 bg-white">
        <div className="p-6 md:p-8 border-b border-slate-300 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Tele-Consultation Registry</h1>
            <p className="text-slate-600 mt-1">Connect with authorized regional health practitioners securely.</p>
          </div>
          <div className="flex flex-wrap text-sm border border-slate-300 bg-white rounded-sm overflow-hidden">
            <button
               onClick={() => { setConsultationType("video"); setSelectedDoctor(null); }}
               className={`px-4 py-2 font-bold uppercase transition-none ${consultationType === "video" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >Video Link</button>
            <button
               onClick={() => { setConsultationType("audio"); setSelectedDoctor(null); }}
               className={`px-4 py-2 font-bold uppercase border-l border-slate-300 transition-none ${consultationType === "audio" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >Audio Voice</button>
            <button
               onClick={() => navigate("/test-chat")}
               className={`px-4 py-2 font-bold uppercase border-l border-slate-300 transition-none ${consultationType === "chat" ? "bg-[#0056b3] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >Text Chat</button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {consultationType === "video" && !selectedDoctor && (
            <div className="mb-6 p-4 border border-[#0056b3] bg-[#e6f2ff] flex justify-between items-center text-[#0056b3]">
              <span className="font-bold text-sm uppercase tracking-wider">Emergency Standby Consultation</span>
               <button
                onClick={() => navigate(`/test-call?room=room-${Date.now()}`)}
                className="px-6 py-2 bg-[#0056b3] text-white text-sm font-bold uppercase hover:bg-blue-800 transition-none border border-transparent focus:ring-2 focus:ring-[#0056b3]"
              >
                Launch Now
              </button>
            </div>
          )}

          {bookingSuccess && (
            <div className="mb-6 px-4 py-3 bg-[#e8f5e9] border border-green-300 text-green-900 text-sm font-bold uppercase tracking-wider">
               {bookingSuccess}
            </div>
          )}

          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-4">
             {consultationType ? `Authorized Providers (${consultationType})` : "General Regional Directory"}
          </h2>

          {loadingDocs && (
            <div className="p-10 border border-slate-300 text-center text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-5 h-5 animate-spin" /> Fetching Master List...
            </div>
          )}

          {!loadingDocs && fetchError && (
            <div className="p-6 border border-red-300 bg-red-50 text-red-800 font-bold uppercase tracking-wider text-sm">
              Critical Error: {fetchError}
            </div>
          )}

          {!loadingDocs && !fetchError && doctors.length === 0 && (
            <div className="p-10 border border-slate-300 text-center text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
              No registered practitioners available current roster.
            </div>
          )}

          {!loadingDocs && !fetchError && doctors.length > 0 && (
            <div className="border border-slate-300 rounded-sm overflow-hidden">
               {/* Government Directory Style Table for large screens, stacked for small */}
               <table className="w-full text-left text-sm text-slate-700 hidden md:table">
                 <thead className="bg-slate-100 border-b border-slate-300 text-slate-900 uppercase">
                   <tr>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">Practitioner Name</th>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">Specialty</th>
                     <th className="px-4 py-3 font-bold border-r border-slate-300">Status</th>
                     <th className="px-4 py-3 font-bold">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-300">
                   {doctors.map(doc => (
                     <tr key={doc.id} className={selectedDoctor?.id === doc.id ? "bg-[#e6f2ff]" : "hover:bg-slate-50"}>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                          <div className="font-bold text-slate-900">{doc.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{doc.qualification || "Unspecified Credentials"}</div>
                       </td>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                          <div className="font-semibold text-slate-900">{doc.specialty}</div>
                          <div className="text-xs text-slate-500 mt-1">{doc.experience} Years Exp. | Reg Fee: ₹{doc.fee}</div>
                       </td>
                       <td className="px-4 py-4 border-r border-slate-300 align-top">
                          {doc.availability === "Available" ? (
                            <span className="px-2 py-1 bg-[#e8f5e9] text-green-900 border border-green-300 text-xs font-bold uppercase">Ready</span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase">{doc.availability}</span>
                          )}
                          {doc.verified && <div className="mt-2 text-blue-700 text-xs font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> CERTIFIED</div>}
                       </td>
                       <td className="px-4 py-4 align-top">
                         <button
                           onClick={() => { setSelectedDoctor(doc); setShowBooking(false); }}
                           className={`px-4 py-2 w-full text-xs font-bold uppercase border transition-none ${selectedDoctor?.id === doc.id ? "bg-[#0056b3] text-white border-[#0056b3]" : "bg-white text-[#0056b3] border-[#0056b3] hover:bg-[#e6f2ff]"}`}
                         >Select File</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>

               <div className="md:hidden divide-y divide-slate-300">
                  {doctors.map(doc => (
                     <div key={doc.id} className={`p-4 ${selectedDoctor?.id === doc.id ? "bg-[#e6f2ff]" : "bg-white"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-slate-900 text-base">{doc.name}</div>
                          {doc.availability === "Available" ? (
                            <span className="px-2 py-1 bg-[#e8f5e9] text-green-900 border border-green-300 text-[10px] font-bold uppercase">Ready</span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold uppercase">{doc.availability}</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold">{doc.specialty}</div>
                        <div className="text-xs text-slate-500 mt-1 mb-3">{doc.qualification || "Unspecified"} | {doc.experience} Yrs | ₹{doc.fee}</div>
                        <button
                           onClick={() => { setSelectedDoctor(doc); setShowBooking(false); }}
                           className={`px-4 py-2 w-full text-xs font-bold uppercase border transition-none ${selectedDoctor?.id === doc.id ? "bg-[#0056b3] text-white border-[#0056b3]" : "bg-white text-[#0056b3] border-[#0056b3] hover:bg-[#e6f2ff]"}`}
                         >Select File</button>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* Action Pane after selecting doc */}
          {selectedDoctor && (
             <div className="mt-8 p-6 bg-slate-100 border border-slate-300">
               <h3 className="font-bold text-slate-900 uppercase mb-4 border-b border-slate-300 pb-2">Actions for {selectedDoctor.name}</h3>
               <div className="flex flex-wrap gap-4">
                  <button
                    onClick={openBooking}
                    className="px-6 py-3 bg-[#0056b3] text-white text-sm font-bold uppercase hover:bg-blue-800 transition-none flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" /> Schedule Visit
                  </button>
                  {consultationType === "audio" && (
                    <button
                      onClick={() => alert(`Direct audio routing currently inactive due to line stability.`)}
                      className="px-6 py-3 bg-white text-[#0056b3] border border-[#0056b3] text-sm font-bold uppercase hover:bg-[#e6f2ff] transition-none flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" /> Request Direct Voice
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
               <h2 className="font-bold text-slate-900 uppercase">Consultation Requisition</h2>
               <button onClick={() => setShowBooking(false)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleBookAppointment(); }} className="p-6 space-y-4 bg-white">
              <div className="p-3 bg-slate-50 border border-slate-300 mb-2">
                <p className="text-sm"><strong>Subject:</strong> {selectedDoctor.name} ({selectedDoctor.specialty})</p>
                <p className="text-sm text-slate-600"><strong>Fee Code:</strong> Standard Registry (₹{selectedDoctor.fee})</p>
              </div>

              {bookingError && <div className="p-3 border border-red-300 bg-red-50 text-red-800 text-sm font-bold uppercase">{bookingError}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Appointment Date *</label>
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
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">Select Slot *</label>
                {loadingSlots ? (
                  <div className="py-4 text-center text-sm font-bold text-[#0056b3] uppercase">Querying Grid...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-4 text-center text-sm font-bold text-slate-500 uppercase">Availability Blocked</div>
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
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Preliminary Notes</label>
                <textarea
                   value={bookingNotes}
                   onChange={e => setBookingNotes(e.target.value)}
                   className="w-full px-3 py-2 border border-slate-300 bg-white text-sm focus:border-[#0056b3] outline-none resize-none"
                   rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowBooking(false)} className="flex-1 py-2 border border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={!bookingDate || !bookingTime} className="flex-1 py-2 bg-[#0056b3] text-white font-bold uppercase hover:bg-blue-800 disabled:opacity-50">Transmit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
