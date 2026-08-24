// src/pages/SellerDashboard.jsx
import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import SellerDashboardOrders from "./SellerDashboardOrders"; // Import Komponen Orders Penjual
import {
  Package,
  DollarSign,
  ShoppingBag,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  X,
} from "lucide-react";

export default function SellerDashboard({ user, onBackToBuyer }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products"); // 'products' atau 'orders'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    weight: "100",
    description: "",
    image: null,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resCat, resOrders] = await Promise.all([
        axiosClient.get("/seller/products/"),
        axiosClient.get("/categories/"),
        axiosClient.get("/seller/orders/"),
      ]);
      setProducts(resProd.data);
      setCategories(resCat.data);
      setOrders(resOrders.data);
    } catch (err) {
      console.error("Gagal mengambil data seller:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hitung total pendapatan dari order yang sudah LUNAS (PAID)
  const totalRevenue = orders
    .filter(
      (o) =>
        o.status === "PAID" ||
        o.status === "SHIPPED" ||
        o.status === "DELIVERED",
    )
    .reduce((acc, curr) => acc + parseFloat(curr.subtotal || 0), 0);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: categories[0]?.id || "",
      price: "",
      stock: "",
      weight: "100",
      description: "",
      image: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      weight: product.weight || "100",
      description: product.description || "",
      image: null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("category", formData.category);
    data.append("price", formData.price);
    data.append("stock", formData.stock);
    data.append("weight", formData.weight);
    data.append("description", formData.description);

    if (formData.image instanceof File) {
      data.append("image", formData.image);
    }

    try {
      if (editingProduct) {
        await axiosClient.put(`/products/${editingProduct.id}/`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Produk berhasil diperbarui!");
      } else {
        await axiosClient.post("/seller/products/", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Produk baru berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan produk:", err.response?.data);
      alert("Gagal menyimpan produk.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      try {
        await axiosClient.delete(`/products/${id}/`);
        alert("Produk berhasil dihapus!");
        fetchData();
      } catch (err) {
        console.error("Gagal menghapus produk:", err);
        alert("Gagal menghapus produk.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToBuyer}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-sm px-3 py-1.5 rounded-lg text-gray-300 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Belanja
            </button>
            <h1 className="text-xl font-bold tracking-wide">Seller Centre</h1>
          </div>
          <div className="text-sm text-slate-400">
            Pemilik Toko:{" "}
            <span className="font-semibold text-white">
              {user?.username || user?.email}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <DollarSign className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Total Pendapatan
              </p>
              <h3 className="text-2xl font-bold text-gray-800">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pesanan Masuk</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {orders.length} Pesanan
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Total Produk Aktif
              </p>
              <h3 className="text-2xl font-bold text-gray-800">
                {products.length} Produk
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Sub-Menu */}
        <div className="flex gap-4 mb-6 border-b pb-2">
          <button
            onClick={() => setActiveTab("products")}
            className={`font-semibold text-sm pb-2 border-b-2 transition ${
              activeTab === "products"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Daftar Produk Toko
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`font-semibold text-sm pb-2 border-b-2 transition ${
              activeTab === "orders"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pesanan Masuk & Pembayaran
          </button>
        </div>

        {/* Dynamic Section Render */}
        {activeTab === "orders" ? (
          <SellerDashboardOrders />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Daftar Produk Toko
                </h2>
                <p className="text-xs text-gray-500">
                  Kelola stok, gambar, dan harga produk Anda
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                <Plus className="h-4 w-4" /> + Tambah Produk Baru
              </button>
            </div>

            {loading ? (
              <p className="text-center py-8 text-gray-500">
                Memuat data produk...
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <th className="py-3 px-4">Gambar</th>
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Harga</th>
                      <th className="py-3 px-4">Stok</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-6 text-gray-500"
                        >
                          Belum ada produk. Klik "+ Tambah Produk Baru" untuk
                          menambahkan.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {p.image ? (
                              <img
                                src={
                                  p.image.startsWith("http")
                                    ? p.image
                                    : `http://127.0.0.1:8000${p.image}`
                                }
                                alt={p.name}
                                className="w-12 h-12 object-cover rounded-lg border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                No Img
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {p.name}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            Rp {Number(p.price).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-semibold">
                              {p.stock} pcs
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Form Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800">
                {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Sepatu Sneakers"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="250000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Stok
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Berat (Gram)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Tuliskan deskripsi lengkap produk..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Gambar Produk
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.files[0] })
                  }
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  {editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
