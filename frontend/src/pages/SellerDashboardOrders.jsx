// src/pages/SellerDashboardOrders.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { Check, X, Eye, ShoppingBag } from "lucide-react";

export default function SellerDashboardOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerOrders();
  }, []);

  const fetchSellerOrders = async () => {
    try {
      const res = await axiosClient.get("/seller/orders/");
      setOrders(res.data);
    } catch (err) {
      console.error("Gagal memuat pesanan seller:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (sellerOrderId, action) => {
    try {
      const res = await axiosClient.post(
        `/seller/orders/${sellerOrderId}/review-payment/`,
        { action },
      );
      alert(res.data.message);
      fetchSellerOrders(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memproses persetujuan.");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">
        Memuat pesanan masuk...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-blue-600" /> Pesanan Masuk
        (Dashboard Penjual)
      </h1>

      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
          Belum ada pesanan masuk.
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600">
                  Order ID: #{order.id}
                </span>
                <p className="text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                Status: {order.status}
              </span>
            </div>

            {/* List Barang */}
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.product_name} (x{item.quantity})
                  </span>
                  <span className="font-semibold">
                    Rp {parseFloat(item.price).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            {/* Aksi Verifikasi Pembayaran Manual */}
            {order.status === "PAYMENT_REVIEW" && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  Pembeli telah mengunggah bukti transfer manual. Silakan
                  verifikasi.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(order.id, "APPROVE")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" /> Setujui Pembayaran
                  </button>
                  <button
                    onClick={() => handleReview(order.id, "REJECT")}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <X className="h-4 w-4" /> Tolak
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
