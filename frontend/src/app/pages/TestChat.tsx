import { useState, useRef, useEffect, useCallback } from "react";
import {
  Copy, Check, MessageCircle, Plus, LogIn, Send, Users, ArrowLeft,
} from "lucide-react";
import { toWsUrl } from "../config/runtime";

// ── Config ────────────────────────────────────────────────────────────────────

const CHAT_WS_BASE = toWsUrl("/ws/chat");

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  type: "user" | "remote" | "system";
  sender: string;
  text: string;
  time: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── ChatRoom Component ────────────────────────────────────────────────────────

function ChatRoom({
  roomId,
  userName,
  onLeave,
}: {
  roomId: string;
  userName: string;
  onLeave: () => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(`${CHAT_WS_BASE}/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "system") {
          // Extract peer count from system message
          const match = data.text.match(/(\d+) in room/);
          if (match) setPeerCount(Number(match[1]));

          addMessage({
            id: crypto.randomUUID(),
            type: "system",
            sender: "",
            text: data.text,
            time: timestamp(),
          });
        } else {
          // Chat message from another peer
          addMessage({
            id: crypto.randomUUID(),
            type: "remote",
            sender: data.sender || "Anonymous",
            text: data.text,
            time: timestamp(),
          });
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      setConnected(false);
      addMessage({
        id: crypto.randomUUID(),
        type: "system",
        sender: "",
        text: "Disconnected from chat.",
        time: timestamp(),
      });
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomId, addMessage]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload = { type: "chat", sender: userName, text };
    wsRef.current.send(JSON.stringify(payload));

    // Add to own messages immediately (server relays only to others)
    addMessage({
      id: crypto.randomUUID(),
      type: "user",
      sender: userName,
      text,
      time: timestamp(),
    });
    setDraft("");
    inputRef.current?.focus();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors text-[#64748B]"
            title="Leave chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg text-[#1E293B] font-semibold">Chat Room</h1>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`} />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Users className="w-3.5 h-3.5" />
              <span>{peerCount} in room</span>
            </div>
          </div>
        </div>

        {/* Room code badge */}
        <button
          onClick={copyRoomId}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F7DF3]/10 rounded-md hover:bg-[#4F7DF3]/20 transition-colors"
          title="Copy room code"
        >
          <span className="text-[#4F7DF3] font-mono font-bold text-sm tracking-wider">{roomId}</span>
          {copied
            ? <Check className="w-4 h-4 text-emerald-500" />
            : <Copy className="w-4 h-4 text-[#4F7DF3]" />
          }
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[#94A3B8]">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Share the room code <span className="font-mono font-bold text-[#4F7DF3]">{roomId}</span> to invite someone.</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-[#94A3B8] bg-gray-100 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isOwn = msg.type === "user";

          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] sm:max-w-[60%]`}>
                {!isOwn && (
                  <p className="text-xs text-[#64748B] mb-1 ml-1 font-medium">{msg.sender}</p>
                )}
                <div
                  className={`px-4 py-2.5 rounded-md ${
                    isOwn
                      ? "bg-[#4F7DF3] text-white rounded-br-md"
                      : "bg-white text-[#1E293B] border border-gray-200 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                <p className={`text-[10px] mt-1 ${isOwn ? "text-right mr-1" : "ml-1"} text-[#94A3B8]`}>
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sticky bottom-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={connected ? "Type a message…" : "Connecting…"}
            disabled={!connected}
            className="flex-1 px-4 py-3 rounded-md bg-[#F1F5F9] border border-gray-200 focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 text-sm text-[#1E293B] placeholder-[#94A3B8] disabled:opacity-50 transition-all"
            autoFocus
          />
          <button
            type="submit"
            disabled={!connected || !draft.trim()}
            className="p-3 rounded-md bg-[#4F7DF3] text-white hover:bg-[#3D6DE3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TestChat() {
  const [phase, setPhase] = useState<"lobby" | "chat">("lobby");
  const [roomId, setRoomId] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [userName, setUserName] = useState("");

  const handleCreate = () => {
    if (!userName.trim()) return;
    const id = randomRoomId();
    setRoomId(id);
    setPhase("chat");
  };

  const handleJoin = () => {
    const id = joinInput.trim().toUpperCase();
    if (!id || !userName.trim()) return;
    setRoomId(id);
    setPhase("chat");
  };

  if (phase === "chat") {
    return (
      <ChatRoom
        roomId={roomId}
        userName={userName.trim()}
        onLeave={() => { setPhase("lobby"); setRoomId(""); setJoinInput(""); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-[#4F7DF3]/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-[#4F7DF3]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Test Chat</h1>
          <p className="text-[#64748B] mt-1 text-sm">
            Create a room or join one with a code to start chatting.
          </p>
        </div>

        {/* Name input */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            className="w-full px-4 py-3 rounded-md bg-white border border-gray-200 focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 text-sm text-[#1E293B] placeholder-[#94A3B8] transition-all"
          />
        </div>

        {/* Create Room */}
        <button
          onClick={handleCreate}
          disabled={!userName.trim()}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#4F7DF3] text-white rounded-md hover:bg-[#3D6DE3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Create Chat Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-[#94A3B8] font-medium">OR JOIN</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Join Room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            maxLength={6}
            className="flex-1 px-4 py-3 rounded-md bg-white border border-gray-200 focus:outline-none focus:border-[#4F7DF3] focus:ring-2 focus:ring-[#4F7DF3]/20 text-sm font-mono tracking-widest text-center text-[#1E293B] placeholder-[#94A3B8] uppercase transition-all"
            onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
          />
          <button
            onClick={handleJoin}
            disabled={!joinInput.trim() || !userName.trim()}
            className="px-6 py-3 bg-[#1E293B] text-white rounded-md hover:bg-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
