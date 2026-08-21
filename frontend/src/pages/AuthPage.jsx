import React, { useState } from "react";
import { authApi } from "../api/authApi";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        // Alur Login Native
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);
        setSuccessMsg("Login berhasil! Dialihkan...");
        if (onLoginSuccess) onLoginSuccess(response.data);
      } else {
        // Alur Register Native
        await authApi.register({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        });
        setSuccessMsg("Registrasi berhasil! Silakan login.");
        setIsLogin(true);
        setFormData({ email: "", username: "", password: "" });
      }
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes) {
        setError(typeof errRes === "object" ? JSON.stringify(errRes) : errRes);
      } else {
        setError("Gagal terhubung ke server backend");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler Sukses Login Google
  // Handler Sukses Login Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await authApi.googleLogin(credentialResponse.credential);

      // Simpan token & data user ke localStorage
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("user_data", JSON.stringify(response.data.user)); // <--- SIMPAN USER DATA

      if (onLoginSuccess) {
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError("Gagal login Google");
    } finally {
      setLoading(false);
    }
  };

  // Handler Error Login Google
  const handleGoogleError = () => {
    setError("Autentikasi Google gagal atau dibatalkan.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              isLogin
                ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Masuk Akun
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              !isLogin
                ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Daftar Baru
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {isLogin ? "Selamat Datang Kembali" : "Buat Akun Marketplace"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isLogin
                ? "Masukkan kredensial Anda untuk melanjutkan"
                : "Lengkapi data untuk memulai belanja atau berjualan"}
            </p>
          </div>

          {/* Feedback Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Native */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="john_doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? "Memproses..."
                : isLogin
                  ? "Masuk Sekarang"
                  : "Daftar Akun"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 uppercase font-medium">
              Atau
            </span>
          </div>

          {/* Tombol Google Official SDK Component */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              shape="rectangular"
              theme="outline"
              width="350"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
