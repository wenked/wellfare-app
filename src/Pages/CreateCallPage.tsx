import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreateCallPage: React.FC = () => {
	const { user, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const [serviceUserName, setServiceUserName] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [customMessage, setCustomMessage] = useState(
		'Hi [Name], this is a friendly welfare check-in. Please press 1 if you are okay, or press 2 if you need assistance.'
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!user) {
			setError('You must be logged in to create a call.');
			return;
		}

		// Client-side E.164 format check
		const e164Pattern = /^\+[1-9]\d{1,14}$/;
		if (!e164Pattern.test(phoneNumber)) {
			setError('Invalid phone number format. Please use E.164 format (e.g., +12223334444).');
			setIsSubmitting(false); // Ensure submit button is re-enabled
			return;
		}

		setError(null);
		setSuccessMessage(null);
		setIsSubmitting(true);

		const personalizedMessage = customMessage.replace('[Name]', serviceUserName || 'there');

		try {
			const { data, error: functionError } = await supabase.functions.invoke('schedule-welfare-call', {
				body: {
					userId: user.id,
					serviceUserName,
					phoneNumber,
					customMessage: personalizedMessage,
				},
			});

			if (functionError)
				throw new Error(functionError.message || 'Supabase function returned an error.');
			if (data && data.error) throw new Error(data.error);

			setSuccessMessage(data.message || 'Call scheduled successfully!');
			// setServiceUserName(''); // Optionally clear form
			// setPhoneNumber('');
			// setCustomMessage('Hi [Name]...'); // Reset custom message to default
			// setTimeout(() => navigate('/dashboard'), 2000); // Optional: Navigate after a delay
		} catch (err) {
			console.error('Error creating call:', err);
			const defaultError =
				'Failed to schedule call. Please ensure the phone number is valid and try again.';
			setError(err instanceof Error ? err.message || defaultError : defaultError);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (authLoading) {
		return (
			<div className="min-h-screen bg-slate-100 flex items-center justify-center">
				<p className="text-slate-700 text-lg">Loading user data...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-lg w-full space-y-8 bg-blue p-8 sm:p-10 rounded-xl shadow-md">
				<div className="text-cente bg-red">
					<h2 className="text-3xl font-bold tracking-tight text-slate-900">
						Schedule a Welfare Check-in
					</h2>
				</div>
				<form onSubmit={handleSubmit} className="mt-8 space-y-6">
					<div>
						<label htmlFor="serviceUserName" className="block text-sm font-medium text-slate-700 mb-1">
							Service User Name
						</label>
						<input
							type="text"
							id="serviceUserName"
							value={serviceUserName}
							onChange={(e) => setServiceUserName(e.target.value)}
							required
							className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							placeholder="E.g., Jane Doe"
						/>
					</div>
					<div>
						<label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-1">
							Phone Number
						</label>
						<input
							type="tel"
							id="phoneNumber"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							required
							placeholder="E.g., +14155552671"
							className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
						<p className="mt-2 text-xs text-slate-500">Must be E.164 formatted (e.g., +12223334444).</p>
					</div>
					<div>
						<label htmlFor="customMessage" className="block text-sm font-medium text-slate-700 mb-1">
							Check-in Message
						</label>
						<textarea
							id="customMessage"
							value={customMessage}
							onChange={(e) => setCustomMessage(e.target.value)}
							rows={4}
							required
							className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						/>
						<p className="mt-2 text-xs text-slate-500">
							Use [Name] as a placeholder for the user's name.
						</p>
					</div>

					{error && (
						<div className="mt-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
							<strong className="font-semibold">Error:</strong> {error}
						</div>
					)}
					{successMessage && (
						<div className="mt-4 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-md text-sm">
							<strong className="font-semibold">Success:</strong> {successMessage}
						</div>
					)}

					<button
						type="submit"
						disabled={isSubmitting || authLoading}
						className="mt-2 group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
					>
						{isSubmitting ? 'Scheduling Call...' : 'Schedule Call'}
					</button>
				</form>
				<div className="mt-8 text-center">
					<button
						onClick={() => navigate('/dashboard')}
						className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
					>
						View Dashboard
					</button>
				</div>
			</div>
		</div>
	);
};

export default CreateCallPage;
