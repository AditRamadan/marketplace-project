// src/components/ChatModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import { Send, X, MessageSquare, Loader2 } from "lucide-react";

export default function ChatModal({ user, sellerId, storeName, isOpen, onClose }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Inisiasi Room Percakapan & Fetch Riwayat Pesan
  useEffect(() => {
    if (!isOpen || !sellerId) return;

    let isMounted = true;
    setLoading(true);

    const initChat = async () => {
      try {
        const resConv = await axiosClient.post("/chat/conversation/", {
          seller_id: sellerId,
        });

        const convId = resConv.data.conversation_id;
        if (!isMounted) return;
        setConversationId(convId);

        // Ambil riwayat chat lama
        const resMsg = await axiosClient.get(`/chat/conversation/${convId}/messages/`);
        if (isMounted) {
          setMessages(resMsg.data);
          setLoading(false);
        }

        // 2. Hubungkan ke WebSocket Daphne
        const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
        const socket = new WebSocket(
          `${wsScheme}://127.0.0.1:8000/ws/chat/${convId}/`
        );

        socket.onopen = () => {
          console.log("WebSocket Chat Terhubung");
        };

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

        socket.onerror = (err) => {
          console.error("WebSocket Error:", err);
        };

        socketRef.current = socket;
      } catch (err) {
        console.error("Gagal inisialisasi chat:", err);
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isOpen, sellerId]);

  // Auto scroll ke pesan terbawah
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Kirim Pesan via WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    const payload = {
      message: inputMessage,
      sender_id: user?.id,
    };

    socketRef.current.send(JSON.stringify(payload));
    setInputMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[90vw] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header Chat */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 rounded-xl">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">{storeName || "Toko Penjual"}</h3>
            <span className="text-[10px] text-emerald-400 font-medium">Online</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Konten Chat / Message History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4">
            <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
            <span>Belum ada pesan. Mulai obrolan dengan penjual sekarang!</span>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.sender_id === user?.id;
            return (
              <div
                key={idx}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
                  }`}
                >
                  {m.message}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Form Input Kirim Pesan */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Tulis pesan..."
          className="flex-1 px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}