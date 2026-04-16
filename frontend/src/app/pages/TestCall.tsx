import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Check, Share2,
  Wifi, WifiOff, Loader2, Users, Plus, LogIn,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE_URL, toWsUrl } from "../config/runtime";

// ── Config ────────────────────────────────────────────────────────────────────

const SIGNAL_WS_BASE = toWsUrl("/ws/signal");
const BACKEND_LABEL = API_BASE_URL || window.location.origin;
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { 
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];

// ── Types ─────────────────────────────────────────────────────────────────────

type CallStatus = "idle" | "connecting" | "waiting" | "connected" | "failed" | "ended";

interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "error" | "success";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Main Test Page ────────────────────────────────────────────────────────────

export function TestCall() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const urlRoom = searchParams.get("room") ?? "";
  const [phase,  setPhase]  = useState<"lobby" | "call">(urlRoom ? "call" : "lobby");
  const [roomId, setRoomId] = useState(urlRoom);
  const [joinInput, setJoinInput] = useState("");

  const handleCreate = () => {
    const id = randomRoomId();
    setRoomId(id);
    setPhase("call");
  };

  const handleJoin = () => {
    const id = joinInput.trim().toUpperCase();
    if (!id) return;
    setRoomId(id);
    setPhase("call");
  };

  if (phase === "call") {
    return <CallRoom roomId={roomId} onEnd={() => { setPhase("lobby"); setRoomId(""); setJoinInput(""); }} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-md bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-[#4F7DF3]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">{t("WebRTC Test Room")}</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {t("Create a room, share the ID, then open another tab and join.")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Create */}
          <div className="bg-white rounded-md border border-[rgba(79,125,243,0.1)] shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#4F7DF3]">
              <Plus className="w-5 h-5" />
              <span className="font-bold text-[#1E293B]">{t("Create Room")}</span>
            </div>
            <p className="text-sm text-[#64748B]">{t("Start a new call. You'll get a 6-character room ID to share.")}</p>
            <button
              onClick={handleCreate}
              className="mt-auto w-full py-2.5 rounded-md bg-[#4F7DF3] hover:bg-[#3D6DE3] text-white text-sm font-bold transition-colors shadow-[0_2px_10px_rgba(79,125,243,0.3)]"
            >
              {t("Create & Join")}
            </button>
          </div>

          {/* Join */}
          <div className="bg-white rounded-md border border-[rgba(79,125,243,0.1)] shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#4F7DF3]">
              <LogIn className="w-5 h-5" />
              <span className="font-bold text-[#1E293B]">{t("Join Room")}</span>
            </div>
            <p className="text-sm text-[#64748B]">{t("Enter a room ID shared by the other person.")}</p>
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              maxLength={6}
              placeholder={t("e.g. AB12CD")}
              className="px-3.5 py-2.5 rounded-md border border-[rgba(0,0,0,0.1)] text-sm text-[#1E293B] font-mono tracking-widest text-center outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 bg-[#F8FAFC] placeholder:text-[#CBD5E1] placeholder:tracking-normal"
            />
            <button
              onClick={handleJoin}
              disabled={!joinInput.trim()}
              className="mt-auto w-full py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
            >
              {t("Join")}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-8">
          {t("Backend endpoint")}: <span className="font-mono text-[#4F7DF3]">{BACKEND_LABEL}</span>
        </p>
      </div>
    </div>
  );
}

// ── Call Room ─────────────────────────────────────────────────────────────────

function CallRoom({ roomId, onEnd }: { roomId: string; onEnd: () => void }) {
  const { t } = useLanguage();
  const localRef  = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef     = useRef<RTCPeerConnection | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const roleRef   = useRef<"initiator" | "receiver" | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const [status,   setStatus]  = useState<CallStatus>("connecting");
  const [micOn,    setMicOn]   = useState(true);
  const [camOn,    setCamOn]   = useState(true);
  const [copied,     setCopied]    = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [peers,      setPeers]     = useState(0);

  const addLog = useCallback((msg: string, type: "info" | "error" | "success" = "info") => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-10), { time, msg, type }]);
  }, []);

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
      addLog(t("Requesting hardware access..."), "info");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addLog(t("Video + Audio stream captured"), "success");
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          addLog(t("Camera blocked, using audio only"), "info");
        } catch {
          addLog(t("Media access rejected"), "error");
          setStatus("failed");
          return;
        }
      }
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;

      addLog(t("Initializing P2P link..."), "info");
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        if (remoteRef.current) remoteRef.current.srcObject = ev.streams[0];
        setStatus("connected");
        addLog(t("Remote stream received ✅"), "success");
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ice-candidate", candidate: ev.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        addLog(`${t("P2P State")}: ${pc.connectionState}`, "info");
        if (pc.connectionState === "failed") setStatus("failed");
        if (pc.connectionState === "disconnected") setStatus("ended");
      };

      const wsUrl = `${SIGNAL_WS_BASE}/${roomId}`;
      addLog(`${t("Signaling")}: ${wsUrl}`, "info");
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => addLog(t("WS Handshake active"), "success");
      ws.onerror = () => { addLog(t("Signal WS error ❌"), "error"); setStatus("failed"); };

      ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data as string);

        switch (msg.type) {
          case "joined":
            roleRef.current = msg.role;
            setPeers(msg.peers);
            setStatus("waiting");
            addLog(`${t("Joined as")} ${msg.role}`, "info");
            if (msg.role === "receiver") {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "peer-joined":
            setPeers(2);
            addLog(t("Peer detected"), "success");
            if (roleRef.current === "initiator") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
              addLog(t("Offer dispatched"), "info");
            } else {
              ws.send(JSON.stringify({ type: "ready" }));
            }
            break;

          case "ready":
            if (roleRef.current === "initiator" && !pc.localDescription) {
              addLog(t("Peer ready, creating offer"), "info");
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
            while (candidateQueue.current.length) {
              const cand = candidateQueue.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            break;

          case "answer":
            addLog(t("Answer received"), "info");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: msg.sdp }));
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
            setStatus("ended");
            addLog(t("Peer disconnected"), "error");
            break;

          case "room-full":
            setStatus("failed");
            addLog(t("Room capacity reached ❌"), "error");
            break;
        }
      };
    }

    start().catch(err => {
      console.error(err);
      addLog(t("Setup failed"), "error");
      setStatus("failed");
    });

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      pc?.close();
      ws?.close();
    };
  }, [roomId, addLog]);

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(p => !p);
  };

  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(p => !p);
  };

  const copyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/test-call?room=${roomId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const statusColor: Record<CallStatus, string> = {
    idle:       "bg-slate-400",
    connecting: "bg-amber-400 animate-pulse",
    waiting:    "bg-amber-400 animate-pulse",
    connected:  "bg-emerald-400",
    failed:     "bg-rose-500",
    ended:      "bg-rose-400",
  };

  const statusLabel: Record<CallStatus, string> = {
    idle:       t("Idle"),
    connecting: t("Connecting…"),
    waiting:    t("You're waiting · share the invite link so others can join"),
    connected:  t("Connected"),
    failed:     t("Connection failed"),
    ended:      t("Call ended"),
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#0F172A]">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${statusColor[status]}`} />
          <span className="text-white font-semibold text-sm">{statusLabel[status]}</span>
        </div>

        {/* Room ID badge + Share button */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoom}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Copy room ID"
          >
            <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="text-[#4F7DF3] font-mono font-bold tracking-widest text-sm">{roomId}</span>
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
              : <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />}
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F7DF3]/10 hover:bg-[#4F7DF3]/20 border border-[#4F7DF3]/20 transition-colors"
            title="Copy invite link"
          >
            {copiedLink
              ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-xs font-semibold">{t("Copied!")}</span></>
              : <><Share2 className="w-3.5 h-3.5 text-[#4F7DF3]" /><span className="text-[#4F7DF3] text-xs font-semibold">{t("Share")}</span></>
            }
          </button>
        </div>

        <div>
          {status === "connected"  && <Wifi    className="w-5 h-5 text-emerald-400" />}
          {(status === "failed" || status === "ended") && <WifiOff className="w-5 h-5 text-rose-400" />}
          {(status === "connecting" || status === "waiting") && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
        </div>
      </div>

      {/* Video + log */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">

        {/* Videos */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Local */}
          <div className="relative bg-[#1E293B] rounded-md overflow-hidden aspect-video">
            <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-3 text-xs text-white/70 font-semibold bg-black/40 px-2 py-0.5 rounded-full">
              {t("You")} {!camOn && t("· Camera off")} {!micOn && t("· Muted")}
            </div>
          </div>
          {/* Remote */}
          <div className="relative bg-[#1E293B] rounded-md overflow-hidden aspect-video">
            <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
            {status !== "connected" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Video className="w-10 h-10 text-white/20" />
                <span className="text-white/40 text-sm">
                  {status === "waiting" ? t("You're waiting for the other person to join…") : statusLabel[status]}
                </span>
                {(status === "waiting" || status === "connecting") && (
                  <div className="mt-1 text-center">
                    <p className="text-[#94A3B8] text-xs mb-2">{t("Share invite link with the other person")}:</p>
                    <button onClick={copyLink} className="flex items-center gap-2 mx-auto px-4 py-2.5 bg-[#4F7DF3]/20 border border-[#4F7DF3]/30 rounded-md hover:bg-[#4F7DF3]/30 transition-colors">
                      {copiedLink
                        ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-sm font-semibold">{t("Link copied!")}</span></>
                        : <><Share2 className="w-3.5 h-3.5 text-[#4F7DF3]" /><span className="text-[#4F7DF3] text-sm font-semibold">{t("Copy invite link")}</span></>
                      }
                    </button>
                    <p className="text-[#64748B] text-xs mt-2">{t("Room ID")}: <span className="font-mono text-[#4F7DF3] font-bold">{roomId}</span></p>
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-2 left-3 text-xs text-white/70 font-semibold bg-black/40 px-2 py-0.5 rounded-full">
              Remote
            </div>
          </div>
        </div>

        {/* Debug log */}
        <div className="hidden lg:flex flex-col lg:w-72 bg-[#0D1829] rounded-md border border-white/10 p-4 gap-2 font-mono">
          <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1">{t("Connection Log")}</div>
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {logs.length === 0 && <p className="text-[#334155] text-xs italic uppercase">{t("Idle")}</p>}
            {logs.map((l, i) => (
              <div key={i} className="text-[10px] flex gap-2">
                <span className="text-slate-600 shrink-0">{l.time}</span>
                <span className={`break-words ${l.type === "error" ? "text-rose-400" : l.type === "success" ? "text-emerald-400" : "text-slate-400"}`}>
                   {l.msg}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10 text-[10px] text-[#334155] uppercase font-black">
            {t("room")}: {roomId} · {t("role")}: {t(roleRef.current ?? "—")}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 py-5 bg-[#0F172A] border-t border-white/10">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-md flex items-center justify-center transition-colors ${micOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-md flex items-center justify-center transition-colors ${camOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
          title={camOn ? "Camera off" : "Camera on"}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={endCall}
          className="w-14 h-14 rounded-md bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-sm transition-colors"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
