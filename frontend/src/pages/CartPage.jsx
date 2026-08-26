// src/pages/CartPage.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  Store,
} from "lucide-react";

export default function CartPage({
  user,
  onLogout,
  onNavigateToSeller,
  onBack,
  onSelectProduct,
  onGoToCheckout,
}) {
  const { t } = useTranslation();
  const [cartGroups, setCartGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCart = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await axiosClient.get("/cart/");
      setCartGroups(res.data);
    } catch (err) {
      console.error("Gagal mengambil data keranjang:", err);
      setErrorMsg("Gagal memuat keranjang belanja.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (item, delta) => {
    const newQty = item.quantity + delta;

    if (newQty < 1) return;

    if (delta > 0 && newQty > item.product_stock) {
      alert(
        `Jumlah tidak boleh melebihi stok yang tersedia (${item.product_stock} pcs).`,
      );
      return;
    }

    try {
      await axiosClient.post("/cart/", {
        product_id: item.product_id,
        quantity: delta,
      });
      fetchCart();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memperbarui kuantitas.");
    }
  };

  const handleDeleteItem = async (cartItemId) => {
    if (!window.confirm(t("cart.delete_confirm"))) return;

    try {
      await axiosClient.delete(`/cart/${cartItemId}/`);
      fetchCart();
    } catch (err) {
      alert("Gagal menghapus item.");
    }
  };

  const calculateGrandTotal = () => {
    return cartGroups.reduce((accGroup, group) => {
      const groupSubtotal = group.items.reduce(
        (accItem, item) => accItem + parseFloat(item.subtotal),
        0,
      );
      return accGroup + groupSubtotal;
    }, 0);
  };

  const calculateTotalItems = () => {
    return cartGroups.reduce((accGroup, group) => {
      const groupQty = group.items.reduce(
        (accItem, item) => accItem + item.quantity,
        0,
      );
      return accGroup + groupQty;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar
        user={user}
        onLogout={onLogout}
        onNavigateToSeller={onNavigateToSeller}
        cartCount={calculateTotalItems()}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 mb-6 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t("seller.back_to_shop")}
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-blue-600" /> {t("cart.title")}
        </h1>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border">
            <p className="text-slate-500 font-medium">
              {t("common.loading")}
            </p>
          </div>
        ) : cartGroups.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border">
            <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-700">
              {t("cart.empty_title")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t("cart.empty_subtitle")}
            </p>
            <button
              onClick={onBack}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-md shadow-blue-200"
            >
              {t("cart.start_shopping")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Daftar Produk Berdasarkan Seller */}
            <div className="lg:col-span-2 space-y-6">
              {cartGroups.map((group) => (
                <div
                  key={group.seller_id}
                  className="bg-white border rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Store Header */}
                  <div className="bg-slate-50 border-b px-6 py-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-slate-600" />
                    <span className="font-bold text-slate-800 text-sm">
                      {t("cart.store")}: {group.store_name}
                    </span>
                  </div>

                  {/* Item List */}
                  <div className="divide-y">
                    {group.items.map((item) => (
                      <div
                        key={item.cart_item_id}
                        className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() => onSelectProduct(item.product_id)}
                        >
                          <h3 className="font-semibold text-slate-900 hover:text-blue-600 transition">
                            {item.product_name}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Rp {parseFloat(item.price).toLocaleString("id-ID")}
                          </p>
                        </div>

                        {/* Control Quantity & Delete */}
                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex items-center border rounded-lg bg-slate-50">
                            <button
                              onClick={() => handleUpdateQuantity(item, -1)}
                              disabled={item.quantity <= 1}
                              className="p-2 hover:bg-slate-200 disabled:opacity-40 rounded-l-lg text-slate-600 transition"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="px-4 font-semibold text-sm">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => handleUpdateQuantity(item, 1)}
                              disabled={item.quantity >= item.product_stock}
                              className="p-2 hover:bg-slate-200 disabled:opacity-40 rounded-r-lg text-slate-600 transition"
                              title={
                                item.quantity >= item.product_stock
                                  ? "Stok maksimal tercapai"
                                  : "Tambah"
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[100px]">
                            <p className="font-bold text-blue-600 text-sm">
                              Rp{" "}
                              {parseFloat(item.subtotal).toLocaleString(
                                "id-ID",
                              )}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteItem(item.cart_item_id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Ringkasan Belanja */}
            <div className="lg:col-span-1">
              <div className="bg-white border rounded-2xl p-6 shadow-sm sticky top-24">
                <h2 className="font-bold text-lg text-slate-900 mb-4">
                  {t("checkout.bill_summary")}
                </h2>

                <div className="space-y-3 border-b pb-4 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>{t("checkout.product_subtotal")}</span>
                    <span className="font-semibold text-slate-800">
                      {calculateTotalItems()} {t("common.pcs")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center my-6">
                  <span className="font-bold text-slate-800">{t("cart.total")}</span>
                  <span className="font-bold text-xl text-blue-600">
                    Rp {calculateGrandTotal().toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  onClick={onGoToCheckout}
                  disabled={cartGroups.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {t("cart.checkout")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}