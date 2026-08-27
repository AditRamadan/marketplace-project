// src/pages/BuyerChatPage.jsx
import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import ChatModal from "../components/ChatModal";
import {
  MessageSquare,
  Store,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function BuyerChatPage({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axiosClient.get("/buyer/chats/");
      setConversations(res.data);
    } catch (err) {
      console.error("Gagal mengambil daftar obrolan buyer:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (sellerId, sellerDisplayName) => {
    setSelectedSeller({ sellerId, sellerName: sellerDisplayName });
  };

  const handleCloseChat = () => {
    setSelectedSeller(null);
    fetchConversations(); // Refresh daftar pesan setelah modal ditutup
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat obrolan...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pesan Saya</h2>
          <p className="text-xs text-slate-500">
            Daftar percakapan Anda dengan toko
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Belum Ada Obrolan</p>
          <p className="text-xs mt-1">
            Anda belum pernah mengirim pesan ke toko/penjual manapun.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((chat) => {
            // Priority check untuk mengambil Nama Toko dari berbagai kemungkinan field backend:
            const displayName =
              chat.store_name ||
              chat.store?.name ||
              chat.seller_store_name ||
              chat.seller_name ||
              "Toko Penjual";

            return (
              <div
                key={chat.conversation_id || chat.id}
                onClick={() => handleOpenChat(chat.seller_id, displayName)}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition truncate">
                      {displayName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md">
                      {chat.last_message || "Belum ada pesan."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {chat.last_message_time
                        ? new Date(chat.last_message_time).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : ""}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Re-use Komponen ChatModal yang sudah ada */}
      {selectedSeller && (
        <ChatModal
          user={user}
          sellerId={selectedSeller.sellerId}
          storeName={selectedSeller.sellerName}
          isOpen={!!selectedSeller}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}
