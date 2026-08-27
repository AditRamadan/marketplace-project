import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
} from "lucide-react";

export default function RegisterStorePage() {
  const [formData, setFormData] = useState({
    store_name: "",
    store_description: "",
    phone_number: "",
  });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axiosClient.get("/accounts/apply-store/");
      setApplications(res.data);
    } catch (err) {
      console.error("Gagal mengambil status pengajuan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await axiosClient.post("/accounts/apply-store/", formData);
      setSuccessMsg(
        "Pengajuan toko berhasil dikirim! Menunggu persetujuan Admin.",
      );
      setFormData({ store_name: "", store_description: "", phone_number: "" });
      fetchApplications();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
          err.response?.data?.store_name?.[0] ||
          "Gagal mengirim pengajuan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const latestApp = applications[0];

  if (loading)
    return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <Store className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Pendaftaran Toko
          </h1>
          <p className="text-sm text-slate-500">
            Buka toko Anda sendiri dan mulai berjualan
          </p>
        </div>
      </div>

      {latestApp && (
        <div className="bg-slate-50 border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Status Pengajuan Terakhir:
          </h2>

          {latestApp.status === "PENDING" && (
            <div className="flex items-center gap-3 text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <Clock className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  Sedang Menunggu Persetujuan Admin
                </p>
                <p className="text-xs">
                  Toko: <strong>{latestApp.store_name}</strong> (
                  {new Date(latestApp.created_at).toLocaleDateString("id-ID")})
                </p>
              </div>
            </div>
          )}

          {latestApp.status === "APPROVED" && (
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Pengajuan Disetujui!</p>
                <p className="text-xs">
                  Selamat! Toko <strong>{latestApp.store_name}</strong> telah
                  aktif. Silakan masuk ke Dashboard Seller.
                </p>
              </div>
            </div>
          )}

          {latestApp.status === "REJECTED" && (
            <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Pengajuan Ditolak</p>
                <p className="text-xs">
                  Alasan:{" "}
                  {latestApp.rejection_reason || "Tidak ada alasan spesifik."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {(!latestApp || latestApp.status === "REJECTED") && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-800">
            Formulir Buka Toko
          </h2>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {successMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Toko *
            </label>
            <input
              type="text"
              required
              value={formData.store_name}
              onChange={(e) =>
                setFormData({ ...formData, store_name: e.target.value })
              }
              placeholder="Contoh: Toko Berkah Jaya"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder="08123456789"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deskripsi Toko
            </label>
            <textarea
              rows={3}
              value={formData.store_description}
              onChange={(e) =>
                setFormData({ ...formData, store_description: e.target.value })
              }
              placeholder="Jelaskan produk atau jenis toko Anda..."
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Mengirim..." : "Kirim Pengajuan Toko"}
          </button>
        </form>
      )}
    </div>
  );
}
