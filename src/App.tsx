import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'; // Keep your existing App.css or remove if not needed for layout

// Page Components
import AuthPage from './Pages/AuthPage';
import CreateCallPage from './Pages/CreateCallPage';
import DashboardPage from './Pages/DashboardPage';
import NotFoundPage from './Pages/NotFoundPage';
import NavBar from './components/NavBar'; // Align with NavBar.tsx casing

// Auth Provider & Hook
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
	const { user, isLoading } = useAuth();
	console.log('[App.tsx] ProtectedRoute: isLoading:', isLoading, 'User:', user ? user.id : null);

	if (isLoading) {
		console.log('[App.tsx] ProtectedRoute: Showing loading state.');
		// You can replace this with a more sophisticated loading spinner component
		return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
	}

	if (!user) {
		console.log('[App.tsx] ProtectedRoute: No user, navigating to /auth.');
		return <Navigate to="/auth" replace />;
	}
	console.log('[App.tsx] ProtectedRoute: User found, rendering children.');
	return children;
};

const InitialRouteDecider = () => {
	const { user, isLoading } = useAuth();
	console.log(
		'[App.tsx] InitialRouteDecider: isLoading:',
		isLoading,
		'User:',
		user ? user.id : null
	);

	if (isLoading) {
		console.log('[App.tsx] InitialRouteDecider: Showing loading state.');
		return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
	}

	console.log('[App.tsx] InitialRouteDecider: Deciding route. User:', user ? user.id : null);
	return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
};

// New component to contain routes and useAuth logic
const AppRoutes = () => {
	const { user, isLoading } = useAuth();
	const routeKey = isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated';

	return (
		<BrowserRouter>
			{user && <NavBar />} {/* Align with NavBar.tsx casing */}
			{/* Adjust pt-16 (h-16 from Navbar) if Navbar height changes */}
			<div className={`min-h-screen bg-slate-100 ${user ? 'pt-16' : ''}`}>
				{' '}
				{/* Basic app layout styling */}
				{/* Navbar could go here if needed */}
				<Routes key={routeKey}>
					{/* Public Routes */}
					<Route path="/auth" element={<AuthPage />} />

					{/* Protected Routes */}
					<Route
						path="/create-call"
						element={
							<ProtectedRoute>
								<CreateCallPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>

					{/* Default route (e.g., redirect to auth or dashboard based on auth state) */}
					{/* For now, let's make it /auth. We can change this later. */}
					<Route path="/" element={<InitialRouteDecider />} />

					{/* Not Found Route */}
					<Route path="*" element={<NotFoundPage />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
};

function App() {
	return (
		<AuthProvider>
			<AppRoutes />
		</AuthProvider>
	);
}

export default App;
