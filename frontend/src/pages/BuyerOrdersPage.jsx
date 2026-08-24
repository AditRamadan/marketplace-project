// src/pages/BuyerOrdersPage.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Loader2,
} from "lucide-react";

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axiosClient.get("/buyer/orders/");
      setOrders(res.data);
    } catch (err) {
      console.error("Gagal memuat pesanan buyer:", err);
    } finally {
      setLoading(false);
    }
  };

  const syncMidtransStatus = async (masterOrderId) => {
    try {
      await axiosClient.get(`/payments/check-status/${masterOrderId}/`);
    } catch (err) {
      console.error("Gagal sinkronisasi status pembayaran:", err);
    }
  };

  // FUNGSI UNTUK MELANJUTKAN PEMBAYARAN MIDTRANS
  const handlePayNow = async (orderId) => {
    setPayingOrderId(orderId);
    try {
      // Panggil API create payment untuk mengambil snap_token
      const paymentRes = await axiosClient.post(
        `/payments/create/${orderId}/`,
        {
          method: "MIDTRANS",
        },
      );

      const snapToken = paymentRes.data.snap_token;

      if (!snapToken) {
        alert("Gagal mendapatkan token pembayaran Midtrans.");
        return;
      }

      if (window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: async function (result) {
            alert("Pembayaran Berhasil!");
            await syncMidtransStatus(orderId);
            fetchOrders(); // Refresh daftar pesanan
          },
          onPending: async function (result) {
            alert("Menunggu Pembayaran...");
            await syncMidtransStatus(orderId);
            fetchOrders();
          },
          onError: function (result) {
            alert("Gagal melakukan pembayaran Midtrans.");
          },
          onClose: function () {
            alert("Anda menutup pop-up pembayaran Midtrans.");
          },
        });
      } else {
        alert(
          "Midtrans SDK belum dimuat. Pastikan snap.js sudah terpasang di index.html.",
        );
      }
    } catch (err) {
      console.error("Error Lanjutkan Pembayaran:", err);
      alert(err.response?.data?.error || "Gagal melanjutkan pembayaran.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            Lunas
          </span>
        );
      case "PENDING":
        return (
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
            Menunggu Pembayaran
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">
        Memuat pesanan Anda...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Package className="h-6 w-6 text-blue-600" /> Pesanan Saya
      </h1>

      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
          Belum ada riwayat pesanan.
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs text-slate-400">
                  ID Pesanan: #{order.id}
                </span>
                <p className="text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            {/* List Seller Orders */}
            {order.seller_orders.map((sellerOrder) => (
              <div
                key={sellerOrder.id}
                className="bg-slate-50 p-4 rounded-xl space-y-3"
              >
                <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-700">
                    Toko: {sellerOrder.store_name}
                  </span>
                  <span className="text-blue-600 font-semibold">
                    {sellerOrder.status}
                  </span>
                </div>

                {sellerOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} x Rp{" "}
                        {parseFloat(item.price).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <p className="font-bold text-slate-800">
                      Rp{" "}
                      {(item.quantity * parseFloat(item.price)).toLocaleString(
                        "id-ID",
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* Footer Order Card */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">
                  Total Pembayaran
                </span>
                <span className="text-lg font-bold text-blue-600">
                  Rp {parseFloat(order.total_amount).toLocaleString("id-ID")}
                </span>
              </div>

              {/* TOMBOL BAYAR SEKARANG HANYA TAMPIL JIKA STATUS PENDING */}
              {order.status === "PENDING" && (
                <button
                  onClick={() => handlePayNow(order.id)}
                  disabled={payingOrderId === order.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
                >
                  {payingOrderId === order.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Bayar Sekarang
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
