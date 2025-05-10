import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ReactJson from 'react-json-view';
// import { Link } from 'react-router-dom'; // Uncomment if you add the "Schedule New Call" button

// Define a type for our call log entries
interface CallLog {
	id: string;
	service_user_name: string;
	phone_number: string;
	created_at: string; // Consider formatting this date
	status: string;
	// Accommodate string (if needs parsing) or already parsed object for call_response
	call_response: Record<string, unknown> | string | null;
	custom_message: string | null;
	// Add any other fields you expect to display
}

// Updated getSimpleOutcome to handle potentially stringified JSON in call_response
const getSimpleOutcome = (callResponseInput: Record<string, unknown> | string | null): string => {
	if (!callResponseInput) return 'N/A';
	let callResponse: Record<string, unknown> | null = null;

	if (typeof callResponseInput === 'string') {
		try {
			callResponse = JSON.parse(callResponseInput) as Record<string, unknown>;
		} catch (e) {
			console.error('Failed to parse call_response string:', e);
			return 'Invalid Raw Data';
		}
	} else {
		callResponse = callResponseInput;
	}
	if (!callResponse) return 'N/A'; // Should not happen if parsing is successful or input was object

	const outcomeFromTranscript = callResponse.outcome_from_transcript;
	if (typeof outcomeFromTranscript === 'string') {
		return outcomeFromTranscript.replace('_', ' ').toUpperCase();
	}

	const callData = callResponse.call as Record<string, unknown> | undefined;
	if (callData && typeof callData.disconnection_reason === 'string') {
		const reason = callData.disconnection_reason as string;
		if (reason.includes('hangup')) return 'Call Ended';
		if (reason.includes('error')) return 'Error';
		return reason.replace('_', ' ').toUpperCase();
	}

	const eventType = callResponse.event_type;
	if (typeof eventType === 'string') {
		return `Event: ${eventType.replace('_', ' ').toUpperCase()}`;
	}
	return 'Details in Raw';
};

const DashboardPage: React.FC = () => {
	const { user } = useAuth();
	const [callLogs, setCallLogs] = useState<CallLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// State for modal
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalData, setModalData] = useState<Record<string, unknown> | string | null>(null);

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
					.select(
						'id, service_user_name, phone_number, created_at, status, call_response, custom_message'
					)
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

	const openModalWithData = (data: Record<string, unknown> | string | null) => {
		setModalData(data);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setModalData(null);
	};

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
										Message Sent
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
										Outcome / Raw Data
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
										<td
											className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 truncate max-w-xs"
											title={log.custom_message || 'N/A'}
										>
											{log.custom_message || 'N/A'}
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
										<td className="px-6 py-4 text-sm text-slate-700 align-top">
											<div className="flex flex-col items-start">
												<span className="capitalize">{getSimpleOutcome(log.call_response)}</span>
												{log.call_response && (
													<button
														onClick={() => openModalWithData(log.call_response)}
														className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 underline"
													>
														View Raw Data
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</main>

			{/* Modal for JSON Viewer */}
			{isModalOpen && modalData && (
				<div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
					<div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
						<div className="flex justify-between items-center mb-4">
							<h4 className="text-lg font-semibold text-slate-800">Raw Call Data</h4>
							<button
								onClick={closeModal}
								className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
								aria-label="Close modal"
							>
								&times;
							</button>
						</div>
						<div className="overflow-y-auto flex-grow" /* style={{ minHeight: '200px' }} */>
							<ReactJson
								src={typeof modalData === 'string' ? JSON.parse(modalData) : modalData}
								theme="rjv-default"
								collapsed={1}
								displayDataTypes={false}
								enableClipboard={true} // Enable clipboard for modals usually good UX
								style={{ padding: '1rem', fontSize: '0.8rem' }}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default DashboardPage;
