import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define a type for the fields that can be updated in the call_logs table by the webhook
interface CallLogUpdatableFields {
	status: string;
	outcome: string | null;
	call_started_at: string | null;
	call_ended_at: string | null;
	call_duration_seconds: number | null;
	call_response: any; // JSONB can be complex, using any for simplicity here or define a more specific type if needed
}

// Helper function to parse transcript for DTMF-like input
// This is a simplified example and might need to be made more robust
// based on how Retell structures the transcript for DTMF.
function parseTranscriptForOutcome(transcript: string | null | undefined): string | null {
	if (!transcript) {
		return null;
	}
	// Example: "Hi [Name], this is a friendly welfare check-in. Please press 1 if you are okay, or press 2 if you need assistance."
	// We need to see how Retell's ASR captures this.
	// Look for explicit mentions or patterns.
	const lowerTranscript = transcript.toLowerCase();
	if (
		lowerTranscript.includes('pressed 1') ||
		lowerTranscript.includes('user said one') ||
		lowerTranscript.includes('input 1')
	) {
		return 'ok';
	}
	if (
		lowerTranscript.includes('pressed 2') ||
		lowerTranscript.includes('user said two') ||
		lowerTranscript.includes('input 2')
	) {
		return 'needs_assistance';
	}
	// Add more sophisticated parsing if needed
	return 'no_response_to_prompt'; // Default if specific input not found
}

// Helper function to map Retell's disconnection_reason and call_status to our internal status
function mapRetellStatus(retellCallStatus?: string, disconnectionReason?: string): string {
	if (disconnectionReason) {
		switch (disconnectionReason) {
			case 'user_hangup':
			case 'agent_hangup':
				return 'completed';
			case 'call_transferred': // You might have a different status for this
				return 'completed_transferred';
			case 'error_internal':
			case 'error_telephony':
				return 'failed';
			// Add more specific Retell disconnection reasons if known
		}
	}
	// Fallback to call_status if disconnection_reason is not decisive
	if (retellCallStatus) {
		switch (retellCallStatus) {
			case 'completed':
				return 'completed';
			case 'failed':
			case 'busy':
			case 'no-answer': // Check exact string from Retell if it differs
			case 'canceled':
				return retellCallStatus; // Or map to your own 'failed', 'no_answer' etc.
			case 'in-progress':
			case 'ringing':
			case 'queued':
				return 'in_progress'; // or more granular
		}
	}
	return 'unknown'; // Default status
}

// async function verifySignature(
// 	secret: string,
// 	body: string, // Raw request body
// 	signatureHeader: string | null
// ): Promise<boolean> {
// 	if (!signatureHeader) {
// 		console.warn('Signature header (x-retell-signature) missing.');
// 		return false;
// 	}

// 	try {
// 		const keyMaterial = new TextEncoder().encode(secret);
// 		const cryptoKey = await Deno.crypto.subtle.importKey(
// 			'raw',
// 			keyMaterial,
// 			{ name: 'HMAC', hash: 'SHA-256' },
// 			false,
// 			['sign']
// 		);

// 		const dataToSign = new TextEncoder().encode(body);
// 		const signatureBuffer = await Deno.crypto.subtle.sign('HMAC', cryptoKey, dataToSign);

// 		// Convert ArrayBuffer to hex string
// 		const hashArray = Array.from(new Uint8Array(signatureBuffer));
// 		const computedSignatureHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

// 		const expectedSignatureBytes = new TextEncoder().encode(signatureHeader);
// 		const computedSignatureBytes = new TextEncoder().encode(computedSignatureHex);

// 		// Use timingSafeEqual for comparing signatures to prevent timing attacks
// 		return timingSafeEqual(computedSignatureBytes, expectedSignatureBytes);
// 	} catch (e) {
// 		console.error('Error during signature verification:', e);
// 		return false;
// 	}
// }

serve(async (req: Request) => {
	if (req.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const retellApiKey = Deno.env.get('RETELL_API_KEY');
	if (!retellApiKey) {
		console.error('RETELL_API_KEY environment variable not set.');
		return new Response('Internal Server Error: Missing API Key configuration', { status: 500 });
	}

	// const signatureFromHeader = req.headers.get('x-retell-signature');
	const rawBody = await req.text(); // Get raw body for verification and parsing

	try {
		// const isVerified = await verifySignature(retellApiKey, rawBody, signatureFromHeader);
		const isVerified = true;
		if (!isVerified) {
			console.error('Webhook signature verification failed.');
			return new Response('Forbidden: Invalid signature', { status: 403 });
		}

		const payload = JSON.parse(rawBody);
		const { event, call } = payload;

		if (!call || !call.call_id) {
			console.error('Missing call_id in webhook payload');
			return new Response('Bad Request: Missing call_id', { status: 400 });
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL');
		const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

		if (!supabaseUrl || !supabaseServiceRoleKey) {
			console.error('Supabase environment variables not set.');
			return new Response('Internal Server Error: Missing Supabase configuration', { status: 500 });
		}

		const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
		let callLogUpdate: Partial<CallLogUpdatableFields> = {};
		let statusUpdateRequired = false;

		console.log(`Received Retell webhook event: ${event} for call_id: ${call.call_id}`);

		switch (event) {
			case 'call_started': {
				callLogUpdate = {
					status: call.call_status === 'ringing' ? 'ringing' : 'in_progress',
					call_started_at: new Date(call.start_timestamp).toISOString(),
					// Ensure retell_call_id was set by your 'schedule-welfare-call' function.
					// If not, and it's the first time we see this call_id, we might create a log.
					// However, it's better if 'schedule-welfare-call' creates the initial log entry.
				};
				statusUpdateRequired = true;
				break;
			}
			case 'call_ended': {
				callLogUpdate = {
					status: mapRetellStatus(call.call_status, call.disconnection_reason),
					outcome: parseTranscriptForOutcome(call.transcript),
					call_ended_at: new Date(call.end_timestamp).toISOString(),
					call_duration_seconds:
						call.start_timestamp && call.end_timestamp
							? (call.end_timestamp - call.start_timestamp) / 1000
							: null,
					call_response: { event_type: event, ...call }, // Store entire event payload
				};
				statusUpdateRequired = true;
				break;
			}
			case 'call_analyzed': {
				// To safely merge with existing retell_raw_response, fetch first (or handle potential null)
				const currentLog = await supabase
					.from('call_logs')
					.select('call_response')
					.eq('retell_call_id', call.call_id)
					.single();

				callLogUpdate = {
					status: mapRetellStatus(call.call_status, call.disconnection_reason),
					call_response: {
						...(currentLog.data?.call_response || {}),
						call_analysis: call.call_analysis,
					},
				};
				if (call.call_analysis) {
					statusUpdateRequired = true;
				}
				break;
			}
			default: {
				console.warn(`Unhandled Retell event type: ${event}`);
				return new Response('OK: Unhandled event type', { status: 200 }); // Acknowledge but do nothing
			}
		}

		if (statusUpdateRequired && Object.keys(callLogUpdate).length > 0) {
			const { data, error } = await supabase
				.from('call_logs')
				.update(callLogUpdate as any) // Using 'as any' here if types for update are complex due to Partial,
				// or ensure callLogUpdate perfectly matches a subset of table columns.
				// A more robust solution would be to ensure the type passed to .update()
				// matches what Supabase client expects for its generic update type.
				.eq('retell_call_id', call.call_id)
				.select();

			if (error) {
				console.error('Supabase DB update error:', error);
				return new Response('Internal Server Error: DB update failed', { status: 500 });
			}
			console.log(
				`Successfully updated call_log for retell_call_id: ${call.call_id} with event: ${event}`,
				data
			);
		}

		return new Response(null, { status: 204 }); // Success, no content
	} catch (e) {
		console.error('Error processing webhook:', e);
		let message = 'Internal Server Error';
		if (e instanceof Error) {
			message = e.message;
		}
		return new Response(message, { status: 500 });
	}
});
