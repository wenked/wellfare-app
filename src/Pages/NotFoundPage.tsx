import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen text-center">
			<h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
			<p className="mb-8">Sorry, the page you are looking for does not exist.</p>
			<Link to="/" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">
				Go to Homepage
			</Link>
		</div>
	);
};

export default NotFoundPage;
