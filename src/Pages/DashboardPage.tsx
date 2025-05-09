import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
// import { Link } from 'react-router-dom'; // Uncomment if you add the "Schedule New Call" button

// Define a type for our call log entries
interface CallLog {
	id: string;
	service_user_name: string;
	phone_number: string;
	created_at: string; // Consider formatting this date
	status: string;
	call_response: string | null;
	// Add any other fields you expect to display
}

const DashboardPage: React.FC = () => {
	const { user } = useAuth();
	const [callLogs, setCallLogs] = useState<CallLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchCallLogs = async () => {
			if (!user) {
				setLoading(false);
				// setError(\'User not found, please log in.\'); // Or handle appropriately
				return;
			}

			try {
				setLoading(true);
				setError(null);
				// Ensure \'call_logs\' is the correct table name and RLS is set up
				const { data, error: dbError } = await supabase
					.from('call_logs') // This is the table we planned
					.select('id, service_user_name, phone_number, created_at, status, call_response')
					.eq('user_id', user.id) // Fetch logs for the current user
					.order('created_at', { ascending: false }); // Show newest first

				if (dbError) {
					throw dbError;
				}

				setCallLogs(data || []);
			} catch (err) {
				console.error('Error fetching call logs:', err);
				if (err instanceof Error) {
					setError(err.message || 'Failed to fetch call logs.');
				} else {
					setError('An unknown error occurred.');
				}
			} finally {
				setLoading(false);
			}
		};

		fetchCallLogs();
	}, [user]); // Refetch if user changes

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-100 flex items-center justify-center">
				<p className="text-slate-700 text-lg">Loading call logs...</p>
				{/* You could add a spinner here */}
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
					<strong className="font-bold">Error:</strong>
					<span className="block sm:inline"> {error}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
			<header className="mb-8">
				<div className="max-w-7xl mx-auto">
					<h1 className="text-3xl font-bold leading-tight text-slate-900">Call Dashboard</h1>
					{/* Optional: Add a button to navigate to CreateCallPage */}
					{/* <Link to="/create-call" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> 
					  Schedule New Call
					</Link> */}
				</div>
			</header>

			<main className="max-w-7xl mx-auto">
				{callLogs.length === 0 ? (
					<div className="text-center bg-white shadow-sm rounded-lg p-12">
						{/* Icon suggestion: could add an SVG icon here */}
						<h3 className="text-xl font-medium text-slate-800">No Call Logs Found</h3>
						<p className="mt-2 text-sm text-slate-600">
							You haven't scheduled any welfare check-in calls yet.
						</p>
						{/* <Link to="/create-call" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Schedule Your First Call
            </Link> */}
					</div>
				) : (
					<div className="bg-white shadow-md rounded-lg overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
									>
										Service User
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
									>
										Phone Number
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
									>
										Scheduled At
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
									>
										Status
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
									>
										Outcome
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{callLogs.map((log) => (
									<tr key={log.id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
											{log.service_user_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{log.phone_number}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
											{new Date(log.created_at).toLocaleString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
													log.status === 'completed'
														? 'bg-green-100 text-green-700'
														: log.status === 'completed_transferred'
														? 'bg-teal-100 text-teal-700'
														: log.status === 'scheduled'
														? 'bg-blue-100 text-blue-700'
														: log.status === 'ringing'
														? 'bg-yellow-100 text-yellow-700'
														: log.status === 'in_progress'
														? 'bg-amber-100 text-amber-700'
														: log.status === 'failed'
														? 'bg-red-100 text-red-700'
														: log.status === 'busy' || log.status === 'no_answer'
														? 'bg-orange-100 text-orange-700'
														: log.status === 'canceled'
														? 'bg-gray-100 text-gray-700'
														: 'bg-slate-100 text-slate-700' // Default for unknown or other statuses
												}`}
											>
												{log.status.replace('_', ' ')}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
											{log.call_response ? log.call_response.replace('_', ' ').toUpperCase() : 'N/A'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</main>
		</div>
	);
};

export default DashboardPage;
