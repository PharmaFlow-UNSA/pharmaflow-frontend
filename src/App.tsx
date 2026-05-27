import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { AllergiesPage } from "@/pages/AllergiesPage";
import { FamilyMembersPage } from "@/pages/FamilyMembersPage";
import { HealthPage } from "@/pages/HealthPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { ProductAvailabilityPage } from "@/pages/ProductAvailabilityPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReservationsPage } from "@/pages/ReservationsPage";
import { ReserveProductPage } from "@/pages/ReserveProductPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { TherapiesPage } from "@/pages/TherapiesPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />

        {/* Protected (JWT required) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:productId/availability" element={<ProductAvailabilityPage />} />
            <Route path="products/:productId/reserve" element={<ReserveProductPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="reservations" element={<ReservationsPage />} />

            {/* User & Health Service */}
            <Route path="health" element={<HealthPage />} />
            <Route path="health/allergies" element={<AllergiesPage />} />
            <Route path="health/therapies" element={<TherapiesPage />} />
            <Route path="health/family-members" element={<FamilyMembersPage />} />

            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
