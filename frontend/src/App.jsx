import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar  from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Landing      from "./pages/Landing";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import ImageDetect  from "./pages/ImageDetect";
import VideoDetect  from "./pages/VideoDetect";
import History      from "./pages/History";
import AlertsCenter from "./pages/AlertsCenter";
import Analytics    from "./pages/Analytics";
import Settings     from "./pages/Settings";
import Users        from "./pages/Users";

function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="page-root">
      <Navbar />
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/"      element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard"    element={<Dashboard />}    />
        <Route path="/detect/image" element={<ImageDetect />}  />
        <Route path="/detect/video" element={<VideoDetect />}  />
        <Route path="/history"      element={<History />}      />
        <Route path="/alerts"       element={<AlertsCenter />} />
        <Route path="/analytics"    element={<Analytics />}    />
        <Route path="/settings"     element={<Settings />}     />
        <Route path="/users"        element={<AdminOnly><Users /></AdminOnly>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
