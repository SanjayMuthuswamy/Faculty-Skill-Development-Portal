import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './app/providers/AuthProvider';
import { ProtectedRoute } from './app/router/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoadingState } from './components/ui/LoadingState';

const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));

const FacultyDashboard = lazy(() => import('./pages/faculty/Dashboard'));
const FacultyPrograms = lazy(() => import('./pages/faculty/Programs'));
const ProgramDetails = lazy(() => import('./pages/faculty/ProgramDetails'));
const Practice = lazy(() => import('./pages/faculty/Practice'));
const PracticePlayer = lazy(() => import('./pages/faculty/PracticePlayer'));
const FacultyTests = lazy(() => import('./pages/faculty/Tests'));
const TestPlayer = lazy(() => import('./pages/faculty/TestPlayer'));
const TestResult = lazy(() => import('./pages/faculty/TestResult'));
const FacultyProfile = lazy(() => import('./pages/faculty/Profile'));
const AIGrowthPlan = lazy(() => import('./pages/faculty/AIGrowthPlan'));
const AICoachPage = lazy(() => import('./pages/faculty/AICoach'));
const CoursesPage = lazy(() => import('./pages/faculty/Courses'));
const CourseDetailPage = lazy(() => import('./pages/faculty/CourseDetail'));
const CourseAssessmentPage = lazy(() => import('./pages/faculty/CourseAssessment'));
const CourseCertificatePage = lazy(() => import('./pages/faculty/CourseCertificate'));
const ModuleQuizPage = lazy(() => import('./pages/faculty/ModuleQuiz'));
const Trends = lazy(() => import('./pages/faculty/Trends'));
const ForumPage = lazy(() => import('./pages/faculty/Forum'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminPrograms = lazy(() => import('./pages/admin/Programs'));
const AdminQuestionPacks = lazy(() => import('./pages/admin/QuestionPacks'));
const PackDetail = lazy(() => import('./pages/admin/PackDetail'));
const AdminTestBuilder = lazy(() => import('./pages/admin/TestBuilder'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const FacultyPerformance = lazy(() => import('./pages/admin/FacultyPerformance'));
const FacultyAccountsPage = lazy(() => import('./pages/admin/FacultyAccounts'));
const AIQuestionGen = lazy(() => import('./pages/admin/AIQuestionGen'));
const DraftReview = lazy(() => import('./pages/admin/DraftReview'));
const CourseManagerPage = lazy(() => import('./pages/admin/CourseManager'));
const CourseAnalyticsPage = lazy(() => import('./pages/admin/CourseAnalytics'));
const QueryManagerPage = lazy(() => import('./pages/admin/QueryManager'));

function RouteLoader() {
  return <LoadingState label="Loading page" compact className="min-h-[40vh]" />;
}

function AppRoutes() {
  const { user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard';

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to={dashboardPath} replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to={dashboardPath} replace /> : <Login />} />

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
          <Route path="tests" element={<FacultyTests />} />
          <Route path="tests/:id/play" element={<TestPlayer />} />
          <Route path="tests/:id/result/:attemptId" element={<TestResult />} />
          <Route path="profile" element={<FacultyProfile />} />
          <Route path="growth-plan" element={<AIGrowthPlan />} />
          <Route path="resources" element={<Trends />} />
          <Route path="ai-coach" element={<AICoachPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="courses/:id/modules/:moduleId/quiz" element={<ModuleQuizPage />} />
          <Route path="courses/:id/assessment" element={<CourseAssessmentPage />} />
          <Route path="courses/:id/certificate" element={<CourseCertificatePage />} />
          <Route path="forum" element={<ForumPage />} />
        </Route>

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
          <Route path="faculty-accounts" element={<FacultyAccountsPage />} />
          <Route path="faculty" element={<FacultyPerformance />} />
          <Route path="faculty/:facultyId" element={<FacultyPerformance />} />
          <Route path="question-packs" element={<AdminQuestionPacks />} />
          <Route path="question-packs/:id" element={<PackDetail />} />
          <Route path="test-builder" element={<AdminTestBuilder />} />
          <Route path="ai-insights" element={<AIQuestionGen />} />
          <Route path="draft-review/:id" element={<DraftReview />} />
          <Route path="courses" element={<CourseManagerPage />} />
          <Route path="course-analytics" element={<CourseAnalyticsPage />} />
          <Route path="queries" element={<QueryManagerPage />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? dashboardPath : '/'} replace />} />
      </Routes>
    </Suspense>
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
