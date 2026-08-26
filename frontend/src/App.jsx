// src/App.jsx
import React, { useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import ProductDetail from "./pages/ProductDetail";
import StoreProfilePage from "./pages/StoreProfilePage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import BuyerOrdersPage from "./pages/BuyerOrdersPage"; // 1. Import BuyerOrdersPage

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

  const updateUrl = (view, productId = null, sellerId = null) => {
    const params = new URLSearchParams();
    if (view && view !== "buyer") params.set("view", view);
    if (productId) params.set("productId", productId);
    if (sellerId) params.set("sellerId", sellerId);

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user_data");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
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

  if (currentView === "seller") {
    return (
      <SellerDashboard user={user} onBackToBuyer={() => navigateTo("buyer")} />
    );
  }

  // View Riwayat Pesanan Buyer
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

  // View Keranjang Belanja
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

  // View Halaman Ringkasan Checkout
  if (currentView === "checkout") {
    return (
      <CheckoutPage
        user={user}
        onBackToCart={() => navigateTo("cart")}
        onProceedToPayment={(masterOrderId) => {
          // 2. Arahkan langsung ke halaman pesanan setelah checkout / submit bukti transfer
          navigateTo("orders");
        }}
      />
    );
  }

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

  return (
    <BuyerDashboard
      user={user}
      onLogout={handleLogout}
      onNavigateToSeller={() => navigateTo("seller")}
      onSelectProduct={(productId) => navigateTo("detail", productId)}
      onOpenCart={() => navigateTo("cart")}
      onOpenOrders={() => navigateTo("orders")} // 3. Handler menu pesanan
    />
  );
}

export default App;