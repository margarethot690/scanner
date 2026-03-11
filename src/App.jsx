import './App.css'
import { Suspense, lazy } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/components/ThemeProvider';

const LoginPage = lazy(() => import('./pages/Login'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Admin-only routes
const ADMIN_ROUTES = new Set(['AdminPanel', 'AdminAnalytics', 'AdminNodeRegistrations']);
// Routes that require authentication
const AUTH_ROUTES = new Set(['UserDashboard', 'UserProfile', 'NodeRegistration', ...ADMIN_ROUTES]);

const PageSuspense = ({ children }) => (
  <Suspense fallback={
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  }>
    {children}
  </Suspense>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const wrapRoute = (path, Page) => {
    const requiresAuth = AUTH_ROUTES.has(path);
    const requiresAdmin = ADMIN_ROUTES.has(path);

    const element = (
      <LayoutWrapper currentPageName={path}>
        <PageSuspense>
          <Page />
        </PageSuspense>
      </LayoutWrapper>
    );

    if (requiresAuth || requiresAdmin) {
      return (
        <ProtectedRoute
          isAuthenticated={isAuthenticated}
          user={user}
          requireAdmin={requiresAdmin}
        >
          {element}
        </ProtectedRoute>
      );
    }

    return element;
  };

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<PageSuspense><LoginPage /></PageSuspense>} />
      <Route path="/" element={wrapRoute(mainPageKey, MainPage)} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={wrapRoute(path, Page)}
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
