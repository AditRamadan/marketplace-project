// src/App.jsx
import React, { useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import ProductDetail from "./pages/ProductDetail";
import StoreProfilePage from "./pages/StoreProfilePage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import BuyerOrdersPage from "./pages/BuyerOrdersPage";
import RegisterStorePage from "./pages/RegisterStorePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function App() {
  const [user, setUser] = useState(null);

  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "buyer";
  });

  const [selectedProductId, setSelectedProductId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("productId") || null;
  });

  const [selectedSellerId, setSelectedSellerId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sellerId") || null;
  });

  // Helper untuk mengecek apakah user memiliki hak akses Admin / Superuser
  const checkIsAdmin = (userData) => {
    if (!userData) return false;
    return (
      userData.role === "ADMIN" ||
      userData.is_superuser === true ||
      userData.is_staff === true
    );
  };

  const updateUrl = (view, productId = null, sellerId = null) => {
    const params = new URLSearchParams();
    if (view && view !== "buyer") params.set("view", view);
    if (productId) params.set("productId", productId);
    if (sellerId) params.set("sellerId", sellerId);

    const newUrl = `${window.location.pathname}${
      params.toString() ? "?" + params.toString() : ""
    }`;
    window.history.pushState({}, "", newUrl);
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user_data");
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Jika user adalah Admin/Superuser dan belum ada parameter view di URL, atur default ke admin view
        const params = new URLSearchParams(window.location.search);
        if (checkIsAdmin(parsedUser) && !params.get("view")) {
          setCurrentView("admin");
        }
      } catch (e) {
        console.error("Gagal parse user_data:", e);
      }
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentView(params.get("view") || "buyer");
      setSelectedProductId(params.get("productId") || null);
      setSelectedSellerId(params.get("sellerId") || null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLoginSuccess = (data) => {
    const userData = data.user || data;
    setUser(userData);
    localStorage.setItem("user_data", JSON.stringify(userData));

    // Jika user bertipe ADMIN atau Superuser/Staff, langsung arahkan ke dashboard admin
    if (checkIsAdmin(userData)) {
      navigateTo("admin");
    } else {
      navigateTo("buyer");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    setUser(null);
    navigateTo("buyer");
  };

  const navigateTo = (view, productId = null, sellerId = null) => {
    setCurrentView(view);
    setSelectedProductId(productId);
    setSelectedSellerId(sellerId);
    updateUrl(view, productId, sellerId);
  };

  if (!user) return <AuthPage onLoginSuccess={handleLoginSuccess} />;

  // 1. View Dashboard Admin (Role ADMIN / Superuser / Staff)
  if (currentView === "admin" || checkIsAdmin(user)) {
    return (
      <div>
        <div className="bg-slate-900 text-white p-3 px-6 flex justify-between items-center text-xs">
          <span>
            Logged in as Admin: <strong>{user.email || user.username}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-bold transition"
          >
            Logout
          </button>
        </div>
        <AdminDashboardPage />
      </div>
    );
  }

  // 2. View Dashboard Seller
  if (currentView === "seller") {
    return (
      <SellerDashboard user={user} onBackToBuyer={() => navigateTo("buyer")} />
    );
  }

  // 3. View Pendaftaran Toko (Buyer Apply Store)
  if (currentView === "apply-store") {
    return (
      <div>
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <button
            onClick={() => navigateTo("buyer")}
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition flex items-center gap-1"
          >
            &larr; Kembali ke Beranda
          </button>
        </div>
        <RegisterStorePage />
      </div>
    );
  }

  // 4. View Riwayat Pesanan Buyer
  if (currentView === "orders") {
    return (
      <div>
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <button
            onClick={() => navigateTo("buyer")}
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition flex items-center gap-1"
          >
            &larr; Kembali ke Beranda
          </button>
        </div>
        <BuyerOrdersPage />
      </div>
    );
  }

  // 5. View Keranjang Belanja
  if (currentView === "cart") {
    return (
      <CartPage
        user={user}
        onLogout={handleLogout}
        onNavigateToSeller={() => navigateTo("seller")}
        onBack={() => navigateTo("buyer")}
        onSelectProduct={(productId) => navigateTo("detail", productId)}
        onGoToCheckout={() => navigateTo("checkout")}
      />
    );
  }

  // 6. View Halaman Ringkasan Checkout
  if (currentView === "checkout") {
    return (
      <CheckoutPage
        user={user}
        onBackToCart={() => navigateTo("cart")}
        onProceedToPayment={(masterOrderId) => {
          navigateTo("orders");
        }}
      />
    );
  }

  // 7. View Detail Produk
  if (currentView === "detail" && selectedProductId) {
    return (
      <ProductDetail
        productId={selectedProductId}
        user={user}
        onBack={() => navigateTo("buyer")}
        onLogout={handleLogout}
        onNavigateToSeller={() => navigateTo("seller")}
        onVisitStore={(sellerId) => navigateTo("store", null, sellerId)}
        onOpenCart={() => navigateTo("cart")}
      />
    );
  }

  // 8. View Profil Toko Publik
  if (currentView === "store" && selectedSellerId) {
    return (
      <StoreProfilePage
        sellerId={selectedSellerId}
        user={user}
        onBack={() => {
          if (selectedProductId) {
            navigateTo("detail", selectedProductId);
          } else {
            navigateTo("buyer");
          }
        }}
        onLogout={handleLogout}
        onNavigateToSeller={() => navigateTo("seller")}
        onSelectProduct={(productId) => navigateTo("detail", productId)}
      />
    );
  }

  // 9. View Buyer Dashboard (Default)
  return (
    <BuyerDashboard
      user={user}
      onLogout={handleLogout}
      onNavigateToSeller={() => navigateTo("seller")}
      onNavigateToApplyStore={() => navigateTo("apply-store")}
      onSelectProduct={(productId) => navigateTo("detail", productId)}
      onOpenCart={() => navigateTo("cart")}
      onOpenOrders={() => navigateTo("orders")}
    />
  );
}

export default App;
