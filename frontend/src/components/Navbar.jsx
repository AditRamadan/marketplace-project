// src/components/Navbar.jsx
import React, { useState } from "react";
import {
  ShoppingCart,
  LogOut,
  User,
  Search,
  Store,
  ChevronDown,
  Package,
} from "lucide-react";

export default function Navbar({
  user,
  onLogout,
  onNavigateToSeller,
  onOpenCart,
  onOpenOrders, // <-- Added prop
  cartCount = 0,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isSeller = user?.is_seller || user?.role === "seller";

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-2xl font-bold text-blue-600">TokoKita</span>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari produk yang Anda butuhkan..."
                className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-6">
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
                    <p className="text-xs text-gray-400">Login sebagai</p>
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
                      {isSeller ? "SELLER / PENJUAL" : "BUYER / PEMBELI"}
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
                    Pesanan Saya
                  </button>

                  {isSeller && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigateToSeller();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-medium transition"
                    >
                      <Store className="h-4 w-4" />
                      Toko Saya (Seller)
                    </button>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar / Logout
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
