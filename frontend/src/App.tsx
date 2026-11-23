import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import AuditPage from "./pages/AuditPage";
import IngestPage from "./pages/IngestPage";
import InvestigatePage from "./pages/InvestigatePage";
import LoginPage from "./pages/LoginPage";
import MlTriagePage from "./pages/MlTriagePage";
import TriagePage from "./pages/TriagePage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<TriagePage />} />
            <Route path="/investigate" element={<InvestigatePage />} />
            <Route path="/investigate/:alertId" element={<InvestigatePage />} />
            <Route path="/ingest" element={<IngestPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/ml" element={<MlTriagePage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

