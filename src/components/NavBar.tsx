import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await logout();
			navigate('/auth'); // Redirect to auth page after logout
		} catch (error) {
			console.error('Failed to logout:', error);
			// Optionally show an error message to the user
		}
	};

	if (!user) {
		return null; // Don't render Navbar if user is not logged in
	}

	// Define base and active styles for NavLink
	const linkBaseClasses =
		'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out';
	const linkInactiveClasses = 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50';
	const linkActiveClasses = 'bg-indigo-100 text-indigo-700';

	return (
		<nav className="bg-white border-b border-slate-200 fixed w-full top-0 left-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Left Section: App Title */}
					<div className="flex-shrink-0">
						<NavLink
							to="/dashboard"
							className="text-2xl font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-150 ease-in-out"
						>
							Welfare Checkin
						</NavLink>
					</div>

					{/* Right Section: Grouped Nav Links and Logout Button */}
					<div className="flex items-center space-x-4">
						<NavLink
							to="/dashboard"
							className={({ isActive }) =>
								`${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
							}
						>
							Dashboard
						</NavLink>
						<NavLink
							to="/create-call"
							className={({ isActive }) =>
								`${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
							}
						>
							Schedule Call
						</NavLink>
						<button
							onClick={handleLogout}
							className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
			{/* Mobile menu, show/hide based on menu state - can be implemented later */}
			{/* <div className="md:hidden">
				<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
					<NavLink to="/dashboard" className={({isActive}) => `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses} block`}>Dashboard</NavLink>
					<NavLink to="/create-call" className={({isActive}) => `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses} block`}>Schedule Call</NavLink>
				</div>
			</div> */}
		</nav>
	);
};

export default NavBar;
