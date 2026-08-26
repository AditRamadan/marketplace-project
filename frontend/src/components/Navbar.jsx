// src/components/Navbar.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  LogOut,
  User,
  Search,
  Store,
  ChevronDown,
  Package,
  Globe,
} from "lucide-react";

export default function Navbar({
  user,
  onLogout,
  onNavigateToSeller,
  onOpenCart,
  onOpenOrders,
  cartCount = 0,
}) {
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isSeller = user?.is_seller || user?.role === "seller";

  const toggleLanguage = () => {
    const nextLang = i18n.language === "id" ? "en" : "id";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("app_lang", nextLang);
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-2xl font-bold text-blue-600">TokoKita</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder={t("navbar.search_placeholder")}
                className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Tombol Switch Bahasa ID / EN */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              title="Ganti Bahasa / Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span>{i18n.language === "en" ? "EN" : "ID"}</span>
            </button>

            {/* Keranjang Belanja */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu User */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition focus:outline-none"
              >
                <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {user?.username || user?.email?.split("@")[0] || "User"}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-xs text-gray-400">
                      {t("navbar.login_as")}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.email}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                        isSeller
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isSeller
                        ? t("navbar.seller_badge")
                        : t("navbar.buyer_badge")}
                    </span>
                  </div>

                  {/* Tombol Pesanan Saya untuk Pembeli */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenOrders) onOpenOrders();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition"
                  >
                    <Package className="h-4 w-4 text-gray-500" />
                    {t("navbar.my_orders")}
                  </button>

                  {/* Tombol Toko Saya untuk Seller */}
                  {isSeller && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigateToSeller();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-medium transition"
                    >
                      <Store className="h-4 w-4" />
                      {t("navbar.my_store")}
                    </button>
                  )}

                  {/* Tombol Logout */}
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("navbar.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}