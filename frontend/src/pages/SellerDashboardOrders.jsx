// src/pages/SellerDashboardOrders.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
  Check,
  X,
  Eye,
  ShoppingBag,
  Truck,
  FileText,
  Loader2,
} from "lucide-react";

export default function SellerDashboardOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Modal Preview Bukti Transfer
  const [previewImage, setPreviewImage] = useState(null);

  // State Modal Input Resi Pengiriman
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [shippingData, setShippingData] = useState({
    courier: "JNE",
    tracking_number: "",
    shipping_cost: "15000",
  });
  const [submittingShipping, setSubmittingShipping] = useState(false);

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
      alert(res.data.message || `Pembayaran berhasil di-${action.toLowerCase()}`);
      fetchSellerOrders();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memproses persetujuan.");
    }
  };

  const handleOpenShippingModal = (order) => {
    setShippingModalOrder(order);
    setShippingData({
      courier: "JNE",
      tracking_number: "",
      shipping_cost: "15000",
    });
  };

  const handleSubmitShipping = async (e) => {
    e.preventDefault();
    if (!shippingData.tracking_number) {
      alert("Harap masukkan nomor resi pengiriman!");
      return;
    }

    setSubmittingShipping(true);
    try {
      await axiosClient.post(
        `/seller/orders/${shippingModalOrder.id}/ship/`,
        shippingData,
      );
      alert("Informasi pengiriman berhasil disimpan. Status diubah ke SHIPPED!");
      setShippingModalOrder(null);
      fetchSellerOrders();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memproses pengiriman.");
    } finally {
      setSubmittingShipping(false);
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
        <ShoppingBag className="h-6 w-6 text-blue-600" /> Pesanan Masuk (Dashboard Penjual)
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
              {order.items?.map((item) => (
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
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-amber-800">
                    Pembeli telah mengunggah bukti transfer manual.
                  </p>
                  {order.payment_proof && (
                    <button
                      onClick={() => setPreviewImage(order.payment_proof)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border shadow-xs"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat Bukti
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(order.id, "APPROVE")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Check className="h-4 w-4" /> Setujui Pembayaran
                  </button>
                  <button
                    onClick={() => handleReview(order.id, "REJECT")}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <X className="h-4 w-4" /> Tolak
                  </button>
                </div>
              </div>
            )}

            {/* Aksi Input Pengiriman / Resi (Jika Status PAID / PROCESSING / COD) */}
            {(order.status === "PAID" || order.status === "PROCESSING") && (
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenShippingModal(order)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  <Truck className="h-4 w-4" /> Proses & Masukkan Resi
                </button>
              </div>
            )}

            {/* Tampilan Status Sudah Dikirim */}
            {order.status === "SHIPPED" && order.shipping && (
              <div className="bg-slate-50 border p-3 rounded-xl text-xs text-slate-600 flex justify-between items-center">
                <span>
                  Kurir: <strong>{order.shipping.courier}</strong> | No. Resi:{" "}
                  <strong>{order.shipping.tracking_number}</strong>
                </span>
                <span className="text-blue-600 font-bold">Sedang Dikirim</span>
              </div>
            )}
          </div>
        ))
      )}

      {/* MODAL PRATINJAU BUKTI BAYAR */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 rounded-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Bukti Transfer Pembeli</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto flex items-center justify-center bg-slate-100 rounded-xl p-2">
              <img
                src={previewImage.startsWith("http") ? previewImage : `http://127.0.0.1:8000${previewImage}`}
                alt="Bukti Transfer"
                className="max-h-80 object-contain rounded-lg"
              />
            </div>
            <button
              onClick={() => setPreviewImage(null)}
              className="w-full bg-slate-200 hover:bg-slate-300 font-bold text-xs py-2 rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL INPUT PENGIRIMAN & RESI */}
      {shippingModalOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" /> Input Pengiriman Order #{shippingModalOrder.id}
              </h3>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitShipping} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Kurir
                </label>
                <select
                  value={shippingData.courier}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, courier: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="JNE">JNE</option>
                  <option value="J&T Express">J&T Express</option>
                  <option value="SiCepat">SiCepat</option>
                  <option value="Shopee Xpress">Shopee Xpress</option>
                  <option value="GoSend / GrabExpress">GoSend / GrabExpress</option>
                  <option value="Kurir Toko">Kurir Toko (Manual)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Resi / Bukti Kirim
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: JNE1234567890"
                  value={shippingData.tracking_number}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      tracking_number: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingShipping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {submittingShipping ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    "Kirim Barang"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}