import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { useAuth } from "@/auth/useAuth";
import { Spinner } from "@/components/ui/Spinner";
import { Layout } from "@/components/Layout";
import { NotificationProvider } from "@/notifications/NotificationProvider";
import { AdminFaqLogsPage } from "@/pages/AdminFaqLogsPage";
import { AdminFaqsPage } from "@/pages/AdminFaqsPage";
import { AdminPage } from "@/pages/AdminPage";
import { AdminRecommendationsPage } from "@/pages/AdminRecommendationsPage";
import { AllergiesPage } from "@/pages/AllergiesPage";
import { AutoRefillsPage } from "@/pages/AutoRefillsPage";
import { DeliveriesPage } from "@/pages/DeliveriesPage";
import { FamilyMembersPage } from "@/pages/FamilyMembersPage";
import { FraudPage } from "@/pages/FraudPage";
import { HealthPage } from "@/pages/HealthPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { OrderProductPage } from "@/pages/OrderProductPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PharmaciesPage } from "@/pages/PharmaciesPage";
import { PharmacyDetailPage } from "@/pages/PharmacyDetailPage";
import { PrescriptionsPage } from "@/pages/PrescriptionsPage";
import { ProductAvailabilityPage } from "@/pages/ProductAvailabilityPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { ProductFormPage } from "@/pages/ProductFormPage";
import { DrugInteractionsPage } from "@/pages/DrugInteractionsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";

import { ProductsPage } from "@/pages/ProductsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReservationsPage } from "@/pages/ReservationsPage";
import { ReserveProductPage } from "@/pages/ReserveProductPage";
import { SymptomsPage } from "@/pages/SymptomsPage";
import { TherapyRemindersPage } from "@/pages/TherapyRemindersPage";
import { TherapiesPage } from "@/pages/TherapiesPage";

function GlobalSpinner() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { loading: authLoading } = useAuth();
  if (isFetching === 0 && isMutating === 0 && !authLoading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
      <Spinner className="h-10 w-10" />
    </div>
  );
}

function RootPage() {
  const { hasRole } = useAuth();
  return hasRole("ROLE_ADMIN") ? <AdminPage /> : <HomePage />;
}

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <GlobalSpinner />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />

          {/* Protected (JWT required) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<RootPage />} />

              {/* Catalog */}
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:productId/availability" element={<ProductAvailabilityPage />} />
              <Route
                path="products/new"
                element={<ProtectedRoute roles={["ROLE_PHARMACIST", "ROLE_ADMIN"]} />}
              >
                <Route index element={<ProductFormPage />} />
              </Route>
              <Route path="products/:productId" element={<ProductDetailPage />} />
              <Route
                path="products/:productId/edit"
                element={<ProtectedRoute roles={["ROLE_PHARMACIST", "ROLE_ADMIN"]} />}
              >
                <Route index element={<ProductFormPage />} />
              </Route>
              <Route path="categories" element={<CategoriesPage />} />
              <Route
                path="interactions"
                element={<ProtectedRoute roles={["ROLE_DOCTOR", "ROLE_PHARMACIST", "ROLE_ADMIN"]} />}
              >
                <Route index element={<DrugInteractionsPage />} />
              </Route>
              <Route path="products/:productId/reserve" element={<ReserveProductPage />} />
              <Route path="products/:productId/order" element={<OrderProductPage />} />

              {/* Order & Prescription Service */}
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="prescriptions" element={<PrescriptionsPage />} />
              <Route path="auto-refills" element={<AutoRefillsPage />} />

              {/* Pharmacy & Inventory Service */}
              <Route path="pharmacies" element={<PharmaciesPage />} />
              <Route path="pharmacies/:pharmacyId" element={<PharmacyDetailPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="deliveries" element={<DeliveriesPage />} />

              {/* Smart Features Service */}
              <Route path="symptoms" element={<SymptomsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              {/* User & Health Service */}
              <Route path="health" element={<HealthPage />} />
              <Route path="health/allergies" element={<AllergiesPage />} />
              <Route path="health/reminders" element={<TherapyRemindersPage />} />
              <Route path="health/therapies" element={<TherapiesPage />} />
              <Route path="health/family-members" element={<FamilyMembersPage />} />

              <Route path="profile" element={<ProfilePage />} />
              <Route element={<ProtectedRoute roles={["ROLE_ADMIN"]} />}>
                <Route path="admin" element={<AdminPage />} />
                <Route path="admin/fraud" element={<FraudPage />} />
                <Route path="admin/recommendations" element={<AdminRecommendationsPage />} />
                <Route path="admin/faqs" element={<AdminFaqsPage />} />
                <Route path="admin/faq-logs" element={<AdminFaqLogsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}
