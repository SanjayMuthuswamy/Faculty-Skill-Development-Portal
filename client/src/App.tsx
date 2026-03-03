import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './app/providers/AuthProvider';
import Login from './pages/Login';
import { ProtectedRoute } from './app/router/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyPrograms from './pages/faculty/Programs';
import ProgramDetails from './pages/faculty/ProgramDetails';
import Practice from './pages/faculty/Practice';
import PracticePlayer from './pages/faculty/PracticePlayer';
import FacultyTests from './pages/faculty/Tests';
import TestPlayer from './pages/faculty/TestPlayer';
import TestResult from './pages/faculty/TestResult';
import FacultyProfile from './pages/faculty/Profile';
import AIGrowthPlan from './pages/faculty/AIGrowthPlan';

import AdminDashboard from './pages/admin/Dashboard';
import AdminPrograms from './pages/admin/Programs';
import AdminQuestionPacks from './pages/admin/QuestionPacks';
import PackDetail from './pages/admin/PackDetail';
import AdminTestBuilder from './pages/admin/TestBuilder';
import AdminReports from './pages/admin/Reports';
import FacultyPerformance from './pages/admin/FacultyPerformance';
import AIQuestionGen from './pages/admin/AIQuestionGen';
import DraftReview from './pages/admin/DraftReview';
import Trends from './pages/faculty/Trends';


function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard'} replace /> : <Login />} />

      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Faculty Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="programs" element={<FacultyPrograms />} />
        <Route path="programs/:programId" element={<ProgramDetails />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/play/:setId" element={<PracticePlayer />} />
        <Route path="tests" element={<FacultyTests />} />   {/* Faculty Tests list */}
        <Route path="tests/:id/play" element={<TestPlayer />} />
        <Route path="tests/:id/result/:attemptId" element={<TestResult />} />
        <Route path="profile" element={<FacultyProfile />} />
        <Route path="growth-plan" element={<AIGrowthPlan />} />
        <Route path="resources" element={<Trends />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="programs" element={<AdminPrograms />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="faculty" element={<FacultyPerformance />} />
        <Route path="faculty/:facultyId" element={<FacultyPerformance />} />
        <Route path="question-packs" element={<AdminQuestionPacks />} />
        <Route path="question-packs/:id" element={<PackDetail />} />
        <Route path="test-builder" element={<AdminTestBuilder />} />
        <Route path="ai-insights" element={<AIQuestionGen />} />
        <Route path="draft-review/:id" element={<DraftReview />} />
        <Route path="resources" element={<Trends />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
