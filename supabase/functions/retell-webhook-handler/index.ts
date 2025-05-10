import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define a type for the fields that can be updated in the call_logs table by the webhook
interface CallLogUpdatableFields {
	status: string;
	call_response: string;
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
			case 'dial_failed':
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
			case 'no-answer':
			case 'canceled':
				return retellCallStatus;
			case 'in-progress':
			case 'ringing':
			case 'queued':
				return 'in_progress';
			case 'error':
				return 'failed';
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
				};
				statusUpdateRequired = true;
				break;
			}
			case 'call_ended': {
				callLogUpdate = {
					status: mapRetellStatus(call.call_status, call.disconnection_reason),
					call_response: JSON.stringify(payload), // Store entire event payload
				};
				statusUpdateRequired = true;
				break;
			}
			case 'call_analyzed': {
				callLogUpdate = {
					status: mapRetellStatus(call.call_status, call.disconnection_reason),
					call_response: JSON.stringify(payload),
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
				.update(callLogUpdate)
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
