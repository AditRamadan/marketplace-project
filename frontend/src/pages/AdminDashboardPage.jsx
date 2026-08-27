import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { ShieldCheck, Check, X, Store } from "lucide-react";

export default function AdminDashboardPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState({});

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/accounts/admin/applications/?status=${filter}`
        : "/accounts/admin/applications/";
      const res = await axiosClient.get(url);
      setApplications(res.data);
    } catch (err) {
      console.error("Gagal mengambil daftar pengajuan admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, action) => {
    const reason = rejectionReason[id] || "";
    if (action === "REJECT" && !reason) {
      alert("Harap isi alasan penolakan.");
      return;
    }

    try {
      await axiosClient.post(`/accounts/admin/applications/${id}/review/`, {
        action,
        rejection_reason: reason,
      });
      alert(`Berhasil melakukan ${action} pada pengajuan.`);
      fetchApplications();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memproses aksi.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Kelola persetujuan pembukaan toko baru
            </p>
          </div>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {["PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === st
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">
          Memuat data pengajuan...
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-slate-500">
          Tidak ada pengajuan toko dengan status <strong>{filter}</strong>.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white border rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Store className="h-5 w-5 text-indigo-600" />{" "}
                    {app.store_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pemohon: <strong>{app.user_name}</strong> ({app.user_email})
                    | Telp: {app.phone_number || "-"}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-semibold text-slate-600">
                  {new Date(app.created_at).toLocaleString("id-ID")}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                <strong>Deskripsi:</strong>{" "}
                {app.store_description || "Tidak ada deskripsi."}
              </p>

              {app.status === "PENDING" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <input
                    type="text"
                    placeholder="Alasan penolakan (wajib diisi jika memilih Tolak)..."
                    value={rejectionReason[app.id] || ""}
                    onChange={(e) =>
                      setRejectionReason({
                        ...rejectionReason,
                        [app.id]: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleReview(app.id, "REJECT")}
                      className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                    >
                      <X className="h-4 w-4" /> Tolak
                    </button>
                    <button
                      onClick={() => handleReview(app.id, "APPROVE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <Check className="h-4 w-4" /> Setujui Toko
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
