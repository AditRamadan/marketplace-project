// src/pages/BuyerDashboard.jsx
import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import Navbar from "../components/Navbar";

export default function BuyerDashboard({
  user,
  onLogout,
  onNavigateToSeller,
  onSelectProduct,
  onOpenCart,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartGroups, setCartGroups] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("Fetching products from API...");
        const res = await axiosClient.get("/products/");
        console.log("Data diterima:", res.data);
        setProducts(res.data);
      } catch (err) {
        console.error("Gagal mengambil produk:", err);
      } finally {
        setLoading(false);
      }
    };

    // Mengambil data keranjang agar cartGroups tidak kosong
    const fetchCart = async () => {
      try {
        const res = await axiosClient.get("/cart/");
        const data = Array.isArray(res.data) ? res.data : res.data.groups || [];
        setCartGroups(data);
      } catch (err) {
        console.error("Gagal mengambil data keranjang:", err);
      }
    };

    fetchProducts();
    fetchCart();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={user}
        onLogout={onLogout}
        cartCount={calculateTotalItems()}
        onNavigateToSeller={onNavigateToSeller}
        onOpenCart={onOpenCart}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-md">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Selamat Datang di TokoKita! 👋
          </h1>
          <p className="text-blue-100 text-sm md:text-base">
            Temukan produk favorit Anda dengan harga terbaik dan promo menarik
            hari ini.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Rekomendasi Produk
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Memuat produk...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border">
              Belum ada produk yang dijual.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct && onSelectProduct(product.id)}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div className="w-full h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={
                          product.image.startsWith("http")
                            ? product.image
                            : `http://127.0.0.1:8000${product.image}`
                        }
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-0.5 rounded">
                        {product.category_detail?.name || "Umum"}
                      </span>
                      <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mt-1">
                        {product.name}
                      </h3>
                    </div>
                    <div className="mt-3">
                      <p className="text-base font-bold text-gray-900">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectProduct) onSelectProduct(product.id);
                        }}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
