// src/pages/ProductDetail.jsx
import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import Navbar from "../components/Navbar";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Scale,
  Store,
  ExternalLink,
} from "lucide-react";

export default function ProductDetail({
  productId,
  user,
  onBack,
  onLogout,
  onNavigateToSeller,
  onVisitStore,
  onOpenCart,
}) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  // 1. Tambahkan state cartGroups untuk menampung data keranjang
  const [cartGroups, setCartGroups] = useState([]);

  // Fungsi untuk mengambil data keranjang dari backend
  const fetchCart = async () => {
    try {
      const res = await axiosClient.get("/cart/");
      // Sesuaikan dengan struktur response API (array kelompok toko atau array item)
      const data = Array.isArray(res.data) ? res.data : res.data.groups || [];
      setCartGroups(data);
    } catch (err) {
      console.error("Gagal mengambil data keranjang:", err);
    }
  };

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        const res = await axiosClient.get(`/products/${productId}/`);
        setProduct(res.data);
      } catch (err) {
        console.error("Gagal mengambil detail produk:", err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductDetail();
      fetchCart(); // Fetch data keranjang saat komponen dimuat
    }
  }, [productId]);

  // 2. Perbaiki calculateTotalItems dengan pengamanan null/undefined check
  const calculateTotalItems = () => {
    if (!Array.isArray(cartGroups)) return 0;

    return cartGroups.reduce((accGroup, group) => {
      const groupQty = (group.items || []).reduce(
        (accItem, item) => accItem + (item.quantity || 0),
        0,
      );
      return accGroup + groupQty;
    }, 0);
  };

  const handleAddToCart = async () => {
    if (!product || !product.id) {
      alert("Data produk belum dimuat dengan sempurna.");
      return;
    }

    try {
      const res = await axiosClient.post("/cart/", {
        product_id: product.id,
        quantity: quantity,
      });
      alert(res.data.message || "Produk berhasil ditambahkan ke keranjang!");
      fetchCart(); // 3. Refresh total item keranjang setelah berhasil menambah item
    } catch (err) {
      console.error("Error Add to Cart:", err);
      const errorMsg =
        err.response?.data?.error || "Gagal menambahkan produk ke keranjang.";
      alert(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Memuat detail produk...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={user}
        onLogout={onLogout}
        cartCount={calculateTotalItems()}
        onNavigateToSeller={onNavigateToSeller}
        onOpenCart={onOpenCart}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </button>

        {/* Card Main Product */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex justify-center items-center bg-gray-50 rounded-2xl border p-4">
            {product.image ? (
              <img
                src={
                  product.image.startsWith("http")
                    ? product.image
                    : `http://127.0.0.1:8000${product.image}`
                }
                alt={product.name}
                className="max-h-96 object-contain rounded-xl"
              />
            ) : (
              <div className="h-80 w-full flex items-center justify-center text-gray-400">
                Tidak ada gambar
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {product.category_detail?.name || "Kategori"}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mt-3">
                {product.name}
              </h1>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-blue-600">
                  Rp {Number(product.price).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6 p-4 bg-gray-50 rounded-xl border text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>
                    Stok:{" "}
                    <strong className="text-gray-800">
                      {product.stock} pcs
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-gray-500" />
                  <span>
                    Berat:{" "}
                    <strong className="text-gray-800">
                      {product.weight} gram
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Deskripsi Produk
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.description || "Tidak ada deskripsi."}
                </p>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">
                  Jumlah:
                </span>
                <div className="flex items-center border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 font-semibold text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition shadow-md ${
                  product.stock > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stock > 0 ? "+ Tambah ke Keranjang" : "Stok Habis"}
              </button>
            </div>
          </div>
        </div>

        {/* Widget Informasi Seller / Toko */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 border rounded-full flex items-center justify-center text-slate-700">
              <Store className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">
                {product.seller_profile?.store_name || "Toko Penjual"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Penjual Terverifikasi
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const sellerId =
                typeof product.seller === "object"
                  ? product.seller.id
                  : product.seller;
              onVisitStore(sellerId);
            }}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold px-5 py-2.5 rounded-xl border transition"
          >
            <ExternalLink className="h-4 w-4" /> Kunjungi Toko
          </button>
        </div>
      </main>
    </div>
  );
}
