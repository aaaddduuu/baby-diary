import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { BabyProvider, useBaby } from "./lib/BabyContext";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import RecordPage from "./pages/RecordPage";
import AddRecordPage from "./pages/AddRecordPage";
import EditRecordPage from "./pages/EditRecordPage";
import ExpensePage from "./pages/ExpensePage";
import AddExpensePage from "./pages/AddExpensePage";
import GrowthPage from "./pages/GrowthPage";
import VaccinePage from "./pages/VaccinePage";
import FamilyPage from "./pages/FamilyPage";
import AddMemberPage from "./pages/AddMemberPage";
import JoinFamilyPage from "./pages/JoinFamilyPage";
import MyPage from "./pages/MyPage";
import ProfilePage from "./pages/ProfilePage";
import MomentsPage from "./pages/MomentsPage";
import MomentEditorPage from "./pages/MomentEditorPage";
import SharedMomentsPage from "./pages/SharedMomentsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function BabyRequiredRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hasBaby, loading: babyLoading } = useBaby();

  if (authLoading || babyLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasBaby) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { hasBaby, loading: babyLoading } = useBaby();

  if (authLoading || babyLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? (hasBaby ? <Navigate to="/home" replace /> : <Navigate to="/onboarding" replace />) : <Navigate to="/auth" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/home" element={<BabyRequiredRoute><HomePage /></BabyRequiredRoute>} />
      <Route path="/record" element={<BabyRequiredRoute><RecordPage /></BabyRequiredRoute>} />
      <Route path="/record/add" element={<BabyRequiredRoute><AddRecordPage /></BabyRequiredRoute>} />
      <Route path="/record/edit/:id" element={<BabyRequiredRoute><EditRecordPage /></BabyRequiredRoute>} />
      <Route path="/expense" element={<BabyRequiredRoute><ExpensePage /></BabyRequiredRoute>} />
      <Route path="/expense/add" element={<BabyRequiredRoute><AddExpensePage /></BabyRequiredRoute>} />
      <Route path="/growth" element={<BabyRequiredRoute><GrowthPage /></BabyRequiredRoute>} />
      <Route path="/vaccine" element={<BabyRequiredRoute><VaccinePage /></BabyRequiredRoute>} />
      <Route path="/family" element={<BabyRequiredRoute><FamilyPage /></BabyRequiredRoute>} />
      <Route path="/family/add-member" element={<BabyRequiredRoute><AddMemberPage /></BabyRequiredRoute>} />
      <Route path="/join/:code" element={<JoinFamilyPage />} />
      <Route path="/my" element={<BabyRequiredRoute><MyPage /></BabyRequiredRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/moments" element={<BabyRequiredRoute><MomentsPage /></BabyRequiredRoute>} />
      <Route path="/moments/new" element={<BabyRequiredRoute><MomentEditorPage /></BabyRequiredRoute>} />
      <Route path="/moments/:id/edit" element={<BabyRequiredRoute><MomentEditorPage /></BabyRequiredRoute>} />
    </Routes>
  );
}

export default function App() {
  if (window.location.pathname.startsWith("/share/moments/")) {
    return (
      <Routes>
        <Route path="/share/moments/:token" element={<SharedMomentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <AuthProvider>
      <BabyProvider>
        <AppRoutes />
      </BabyProvider>
    </AuthProvider>
  );
}
