// src/pages/SellerDashboardChats.jsx
import React, { useState, useEffect, useRef } from "react";
import axiosClient from "../api/axiosClient";
import { MessageSquare, Send, User, Loader2 } from "lucide-react";

export default function SellerDashboardChats({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Fetch List Buyer yang Chat ke Toko
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/seller/chats/");
      setConversations(res.data);
      if (res.data.length > 0) {
        selectConversation(res.data[0]);
      }
    } catch (err) {
      console.error("Gagal memuat list chat seller:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Pilih Percakapan & Buka WebSocket
  const selectConversation = async (conv) => {
    setActiveConv(conv);
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      const res = await axiosClient.get(`/chat/conversation/${conv.conversation_id}/messages/`);
      setMessages(res.data);

      const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(
        `${wsScheme}://127.0.0.1:8000/ws/chat/${conv.conversation_id}/`
      );

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender_id: data.sender_id,
            message: data.message,
            timestamp: data.timestamp,
          },
        ]);
      };

      socketRef.current = socket;
    } catch (err) {
      console.error("Gagal membuka room chat:", err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current || !activeConv) return;

    socketRef.current.send(
      JSON.stringify({
        message: inputMessage,
        sender_id: user?.id,
      })
    );
    setInputMessage("");
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border text-center text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat pesan masuk...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border text-center text-slate-500">
        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700">Belum Ada Pesan Masuk</h3>
        <p className="text-xs text-slate-400 mt-1">
          Pesan dari calon pembeli akan otomatis muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-3 h-[600px] overflow-hidden">
      {/* Sidebar List Buyer */}
      <div className="border-r flex flex-col h-full bg-slate-50">
        <div className="p-4 border-b font-bold text-slate-800 text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" /> Pesan Masuk
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {conversations.map((conv) => (
            <div
              key={conv.conversation_id}
              onClick={() => selectConversation(conv)}
              className={`p-4 cursor-pointer transition flex items-center gap-3 ${
                activeConv?.conversation_id === conv.conversation_id
                  ? "bg-blue-50/80 border-l-4 border-blue-600"
                  : "hover:bg-slate-100"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">
                  {conv.buyer_name}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {conv.last_message || "Mulai percakapan..."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Area Chat Room */}
      <div className="md:col-span-2 flex flex-col h-full bg-white">
        {activeConv ? (
          <>
            <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {activeConv.buyer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {activeConv.buyer_name}
                </h4>
                <span className="text-[10px] text-emerald-500 font-semibold">
                  Buyer Aktif
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {messages.map((m, idx) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {m.timestamp
                        ? new Date(m.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t flex gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Balas pesan buyer..."
                className="flex-1 px-4 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold"
              >
                <Send className="h-3.5 w-3.5" /> Balas
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Pilih buyer di sebelah kiri untuk membaca pesan.
          </div>
        )}
      </div>
    </div>
  );
}