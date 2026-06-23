import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import GuestRoute from "./auth/GuestRoute";
import ProtectedRoute from "./auth/ProtectedRoute";
import NotFoundState from "./components/NotFoundState";
import AppLayout from "./layout/AppLayout";
import AuthLayout from "./layout/AuthLayout";
import BuilderPage from "./pages/BuilderPage";
import DatasetPage from "./pages/DatasetPage";
import DatasetsPage from "./pages/DatasetsPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/search" replace />} />
            <Route path="search" element={<SearchPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="datasets/:id" element={<DatasetPage />} />
              <Route path="builder" element={<BuilderPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="me" element={<Navigate to="/profile" replace />} />
            </Route>
            <Route path="*" element={<NotFoundState />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
