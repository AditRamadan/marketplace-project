// src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Truck,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Store,
  AlertCircle,
} from "lucide-react";

export default function CheckoutPage({
  user,
  onBackToCart,
  onProceedToPayment,
}) {
  const { t } = useTranslation();
  const [cartGroups, setCartGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // State Pembayaran & Order ID terbuat
  const [createdMasterOrderId, setCreatedMasterOrderId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("MIDTRANS");
  const [createdPaymentId, setCreatedPaymentId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const SHIPPING_FEE_PER_STORE = 15000;
  const SERVICE_FEE = 2000;

  useEffect(() => {
    fetchCartSummary();
  }, []);

  const fetchCartSummary = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/cart/");
      setCartGroups(res.data);
    } catch (err) {
      console.error("Gagal mengambil data checkout:", err);
    } finally {
      setLoading(false);
    }
  };

  const subtotalProducts = cartGroups.reduce((accGroup, group) => {
    return (
      accGroup +
      group.items.reduce(
        (accItem, item) => accItem + parseFloat(item.subtotal),
        0,
      )
    );
  }, 0);

  const totalShippingFee = cartGroups.length * SHIPPING_FEE_PER_STORE;
  const grandTotal = subtotalProducts + totalShippingFee + SERVICE_FEE;

  const syncMidtransStatus = async (masterOrderId) => {
    try {
      await axiosClient.get(`/payments/check-status/${masterOrderId}/`);
    } catch (err) {
      console.error("Gagal sinkronisasi status pembayaran:", err);
    }
  };

  const handleProcessCheckout = async () => {
    setProcessing(true);
    try {
      let masterOrderId = createdMasterOrderId;

      if (!masterOrderId) {
        if (cartGroups.length === 0) {
          alert("Keranjang belanja Anda kosong.");
          setProcessing(false);
          return;
        }
        const checkoutRes = await axiosClient.post("/checkout/");
        masterOrderId = checkoutRes.data.master_order_id;
        setCreatedMasterOrderId(masterOrderId);
      }

      const paymentRes = await axiosClient.post(
        `/payments/create/${masterOrderId}/`,
        {
          method: selectedMethod,
        },
      );

      if (selectedMethod === "MIDTRANS") {
        const snapToken = paymentRes.data.snap_token;

        if (!snapToken) {
          alert("Gagal mendapatkan token pembayaran dari Midtrans.");
          setProcessing(false);
          return;
        }

        if (window.snap) {
          window.snap.pay(snapToken, {
            onSuccess: async function () {
              alert("Pembayaran Berhasil!");
              await syncMidtransStatus(masterOrderId);
              onProceedToPayment(masterOrderId);
            },
            onPending: async function () {
              alert("Menunggu Pembayaran...");
              await syncMidtransStatus(masterOrderId);
              onProceedToPayment(masterOrderId);
            },
            onError: function () {
              alert("Gagal melakukan pembayaran Midtrans.");
            },
            onClose: function () {
              alert(
                "Anda menutup pop-up pembayaran Midtrans. Anda dapat melanjutkan pembayaran kapan saja dari halaman Pesanan Saya.",
              );
              onProceedToPayment(masterOrderId);
            },
          });
        } else {
          alert("Midtrans SDK belum terpasang dengan benar di index.html.");
        }
      } else if (selectedMethod === "MANUAL") {
        setCreatedPaymentId(paymentRes.data.payment_id);
        setIsSuccess(true);
      } else if (selectedMethod === "COD") {
        alert(paymentRes.data.message || "Order COD berhasil dibuat!");
        onProceedToPayment(masterOrderId);
      }
    } catch (err) {
      console.error("Error Checkout/Payment:", err);
      alert(err.response?.data?.error || "Gagal memproses pesanan.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!proofFile || !createdPaymentId) return;

    const formData = new FormData();
    formData.append("image", proofFile);

    setUploading(true);
    try {
      await axiosClient.post(
        `/payments/${createdPaymentId}/upload-proof/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      alert(
        "Bukti transfer berhasil dikirim. Menunggu verifikasi dari Seller!",
      );
      onProceedToPayment(createdMasterOrderId);
    } catch (err) {
      alert(err.response?.data?.error || "Gagal mengunggah bukti transfer.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (isSuccess && selectedMethod === "MANUAL") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-6 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">
            {t("checkout.upload_proof_title")}
          </h2>
          <p className="text-sm text-slate-600">
            Silakan transfer sebesar{" "}
            <span className="font-bold text-blue-600">
              Rp {grandTotal.toLocaleString("id-ID")}
            </span>{" "}
            ke rekening berikut:
          </p>

          <div className="bg-slate-50 border p-4 rounded-xl text-left text-sm space-y-1">
            <p className="text-slate-500">
              Bank: <span className="font-semibold text-slate-800">BCA</span>
            </p>
            <p className="text-slate-500">
              No. Rekening:{" "}
              <span className="font-semibold text-slate-800">123-456-7890</span>
            </p>
            <p className="text-slate-500">
              Atas Nama:{" "}
              <span className="font-semibold text-slate-800">
                PT Marketplace Indonesia
              </span>
            </p>
          </div>

          <form
            onSubmit={handleUploadProof}
            className="space-y-4 text-left pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t("checkout.upload_proof_desc")}
              </label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setProofFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !proofFile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? t("common.loading") : t("checkout.submit_proof")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBackToCart}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-medium mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t("checkout.back_to_cart")}
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-blue-600" /> {t("checkout.title")}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">
                {t("cart.title")}
              </h2>
              {cartGroups.map((group) => (
                <div
                  key={group.seller_id}
                  className="bg-white rounded-2xl p-5 shadow-sm border"
                >
                  <div className="flex items-center gap-2 border-b pb-3 mb-3">
                    <Store className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800 text-sm">
                      {t("cart.store")}: {group.store_name}
                    </span>
                  </div>
                  <div className="space-y-3 divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div
                        key={item.cart_item_id}
                        className="pt-2 flex justify-between items-center text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.quantity} x Rp{" "}
                            {parseFloat(item.price).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <p className="font-bold text-slate-800">
                          Rp {parseFloat(item.subtotal).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">
                {t("checkout.payment_method")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("MIDTRANS")}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                    selectedMethod === "MIDTRANS"
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <CreditCard
                    className={`h-6 w-6 ${
                      selectedMethod === "MIDTRANS"
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {t("checkout.gateway_title")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("checkout.gateway_desc")}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("MANUAL")}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                    selectedMethod === "MANUAL"
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Building2
                    className={`h-6 w-6 ${
                      selectedMethod === "MANUAL"
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {t("checkout.manual_title")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("checkout.manual_desc")}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("COD")}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                    selectedMethod === "COD"
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Truck
                    className={`h-6 w-6 ${
                      selectedMethod === "COD"
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {t("checkout.cod_title")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("checkout.cod_desc")}
                    </p>
                  </div>
                </button>
              </div>

              {selectedMethod === "MANUAL" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {t("checkout.manual_desc")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border h-fit sticky top-24 space-y-4">
            <h2 className="font-bold text-slate-900 border-b pb-3 text-lg">
              {t("checkout.bill_summary")}
            </h2>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>{t("checkout.product_subtotal")}</span>
                <span className="font-semibold text-slate-800">
                  Rp {subtotalProducts.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>{t("checkout.shipping_fee")} ({cartGroups.length} {t("orders.store")})</span>
                <span className="font-semibold text-slate-800">
                  Rp {totalShippingFee.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>{t("checkout.service_fee")}</span>
                <span className="font-semibold text-slate-800">
                  Rp {SERVICE_FEE.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-bold text-slate-800">{t("checkout.total_bill")}</span>
              <span className="font-bold text-xl text-blue-600">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>

            <button
              onClick={handleProcessCheckout}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {processing ? t("common.loading") : t("checkout.pay_btn")}
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 justify-center pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> {t("checkout.secure_notice")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}