import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react'; // Type-only import for FormEvent
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // Added useNavigate

const AuthPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLogin, setIsLogin] = useState(true); // To toggle between Login and Signup
	const { user, login, signup, isLoading } = useAuth(); // Destructure user
	const navigate = useNavigate(); // Initialize navigate
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// If user is successfully authenticated and not loading, redirect to dashboard
		// This handles the case where the user logs in on this page
		if (user && !isLoading) {
			console.log('[AuthPage] User authenticated, navigating to /dashboard');
			navigate('/dashboard', { replace: true });
		}
	}, [user, isLoading, navigate]); // Depend on user, isLoading, and navigate

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			if (isLogin) {
				await login(email, password);
			} else {
				await signup(email, password);
			}
		} catch (err) {
			console.error('Auth error:', err);
			if (err instanceof Error) {
				setError(err.message || (isLogin ? 'Failed to login.' : 'Failed to sign up.'));
			} else {
				setError(
					isLogin
						? 'An unknown error occurred during login.'
						: 'An unknown error occurred during sign up.'
				);
			}
		}
	};
	console.log('testr');
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-md">
				<div>
					{/* Consider adding a simple logo or app name here */}
					{/* <img className="mx-auto h-12 w-auto" src="/path-to-your-logo.svg" alt="App Name" /> */}
					<h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
						{isLogin ? 'Sign in to your account' : 'Create your account'}
					</h2>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="rounded-md -space-y-px">
						<div>
							<label htmlFor="email-address" className="sr-only">
								Email address
							</label>
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
								placeholder="Email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete={isLogin ? 'current-password' : 'new-password'}
								required
								className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					{error && <p className="text-sm text-red-600 text-center py-1">{error}</p>}

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
						>
							{isLoading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
						</button>
					</div>
				</form>
				<div className="text-sm text-center mt-4">
					<button
						onClick={() => {
							setIsLogin(!isLogin);
							setError(null);
						}}
						className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
					>
						{isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;
