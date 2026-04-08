import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import Cart from "./components/Cart";
import CheckoutPage from "./pages/CheckoutPage";
import ReservationPage from "./pages/ReservationPage";
import AdminDashboard from "./pages/AdminDashboard";
import LoyaltyPage from "./pages/LoyaltyPage";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import ChatWidget from "./components/ChatWidget";

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/reservations" element={<ReservationPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/loyalty" element={<LoyaltyPage />} />
              <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
        <ChatWidget />
      </div>
    </ErrorBoundary>
  );
}

export default App;