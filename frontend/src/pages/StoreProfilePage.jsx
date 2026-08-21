import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import Navbar from "../components/Navbar";
import { ArrowLeft, Store, Package, Calendar } from "lucide-react";

export default function StoreProfilePage({
  sellerId,
  user,
  onBack,
  onLogout,
  onNavigateToSeller,
  onSelectProduct,
}) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        console.log("Fetching store data for sellerId:", sellerId);
        const res = await axiosClient.get(`/stores/${sellerId}/`);
        console.log("Response store & products:", res.data);
        setStore(res.data.store);
        setProducts(res.data.products);
      } catch (err) {
        console.error("Gagal memuat profil toko:", err);
      } finally {
        setLoading(false);
      }
    };
    if (sellerId) fetchStoreData();
  }, [sellerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Memuat profil toko...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={user}
        onLogout={onLogout}
        cartCount={0}
        onNavigateToSeller={onNavigateToSeller}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        {/* Banner Card Profil Toko (Gaya Shopee) */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
              <Store className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {store?.store_name}
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-lg">
                {store?.store_description ||
                  "Toko ini belum memiliki deskripsi."}
              </p>
            </div>
          </div>

          <div className="flex gap-6 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-400">Total Produk</p>
                <p className="font-bold text-gray-800">
                  {products.length} Produk
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-400">Bergabung</p>
                <p className="font-bold text-gray-800">
                  {store?.created_at
                    ? new Date(store.created_at).toLocaleDateString("id-ID", {
                        month: "short",
                        year: "numeric",
                      })
                    : "Baru Saja"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Katalog Produk Toko */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Semua Produk dari Toko Ini
          </h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              Toko ini belum menjual produk apapun.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p.id)}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div className="w-full h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img
                        src={
                          p.image.startsWith("http")
                            ? p.image
                            : `http://127.0.0.1:8000${p.image}`
                        }
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-0.5 rounded">
                        {p.category_detail?.name || "Umum"}
                      </span>
                      <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mt-1">
                        {p.name}
                      </h3>
                    </div>
                    <p className="text-base font-bold text-gray-900 mt-3">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </p>
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
