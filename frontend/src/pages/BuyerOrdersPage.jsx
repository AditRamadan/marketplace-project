// src/pages/BuyerOrdersPage.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import {
  Package,
  Truck,
  CreditCard,
  Loader2,
  Check,
} from "lucide-react";

export default function BuyerOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [completingOrderId, setCompletingOrderId] = useState(null);

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

  const handlePayNow = async (orderId) => {
    setPayingOrderId(orderId);
    try {
      const paymentRes = await axiosClient.post(`/payments/create/${orderId}/`, {
        method: "MIDTRANS",
      });
      const snapToken = paymentRes.data.snap_token;
      if (!snapToken) {
        alert("Gagal mendapatkan token pembayaran Midtrans.");
        return;
      }
      if (window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: async function () {
            alert("Pembayaran Berhasil!");
            await syncMidtransStatus(orderId);
            fetchOrders();
          },
          onPending: async function () {
            alert("Menunggu Pembayaran...");
            await syncMidtransStatus(orderId);
            fetchOrders();
          },
          onError: function () {
            alert("Gagal melakukan pembayaran Midtrans.");
          },
          onClose: function () {
            alert("Anda menutup pop-up pembayaran.");
          },
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || "Gagal melanjutkan pembayaran.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleConfirmReceived = async (sellerOrderId) => {
    if (!window.confirm(t("orders.confirm_received_prompt"))) {
      return;
    }

    setCompletingOrderId(sellerOrderId);
    try {
      const res = await axiosClient.post(`/buyer/orders/${sellerOrderId}/complete/`);
      alert(res.data.message || "Pesanan telah dikonfirmasi selesai!");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyelesaikan pesanan.");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            {t("orders.status_paid")}
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
            {t("orders.status_completed")}
          </span>
        );
      case "PENDING":
      case "WAITING_PAYMENT":
        return (
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
            {t("orders.status_waiting")}
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
        {t("common.loading")}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Package className="h-6 w-6 text-blue-600" /> {t("orders.title")}
      </h1>

      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
          {t("orders.empty_orders")}
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
                  {t("orders.order_id")}: #{order.id}
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
                    {t("orders.store")}: {sellerOrder.store_name}
                  </span>
                  <span
                    className={`font-semibold ${
                      sellerOrder.status === "COMPLETED"
                        ? "text-emerald-600"
                        : sellerOrder.status === "SHIPPED"
                        ? "text-blue-600"
                        : "text-slate-600"
                    }`}
                  >
                    {sellerOrder.status === "COMPLETED"
                      ? t("orders.status_completed")
                      : sellerOrder.status === "SHIPPED"
                      ? t("orders.status_shipped")
                      : sellerOrder.status}
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
                      {(item.quantity * parseFloat(item.price)).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}

                {/* Tombol Konfirmasi Terima Barang */}
                {sellerOrder.status === "SHIPPED" && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-blue-500" /> {t("orders.on_delivery")}
                    </span>
                    <button
                      onClick={() => handleConfirmReceived(sellerOrder.id)}
                      disabled={completingOrderId === sellerOrder.id}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                    >
                      {completingOrderId === sellerOrder.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.loading")}
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> {t("orders.order_received")}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Footer Order Card */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">
                  {t("orders.total_payment")}
                </span>
                <span className="text-lg font-bold text-blue-600">
                  Rp {parseFloat(order.total_amount).toLocaleString("id-ID")}
                </span>
              </div>

              {(order.status === "PENDING" || order.status === "WAITING_PAYMENT") && (
                <button
                  onClick={() => handlePayNow(order.id)}
                  disabled={payingOrderId === order.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
                >
                  {payingOrderId === order.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> {t("orders.pay_now")}
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