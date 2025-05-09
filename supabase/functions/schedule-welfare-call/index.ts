// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'; // Ensure this version is compatible or use latest
import { corsHeaders } from '../_shared/cors.ts'; // We'll create this shared CORS file
// Retell AI Specifics - Replace with actual values and structure
// You'll need to find out Retell's API endpoint for creating calls
// and what an 'agent_id' refers to in their system.
// It might be an agent you configure in the Retell dashboard.
const RETELL_API_URL = 'https://api.retellai.com/v2/create-phone-call'; // Example URL, replace with actual
const RETELL_AGENT_ID_GENERAL_WELFARE = 'agent_a74b74934a6ad975a563dd3d31'; // Example Agent ID
console.log('Hello from Functions!');
serve(async (req) => {
	// Handle CORS preflight request
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: corsHeaders,
		});
	}
	try {
		const { userId, serviceUserName, phoneNumber, customMessage } = await req.json();
		// const supabaseClient = createClient( // This variable was unused
		// 	Deno.env.get('SUPABASE_URL') ?? '',
		// 	Deno.env.get('SUPABASE_ANON_KEY') ?? '',
		// 	{
		// 		global: {
		// 			headers: {
		// 				Authorization: req.headers.get('Authorization')!,
		// 			},
		// 		},
		// 	}
		// );

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);
		// 1. Validate phone number (basic check, Retell will do more)
		const trimmedPhoneNumber = phoneNumber.trim();
		// if (!trimmedPhoneNumber.match(/^\\+[1-9]\\d{1,14}$/)) {
		// 	return new Response(
		// 		JSON.stringify({
		// 			error: 'Invalid phone number format. Must be E.164.',
		// 		}),
		// 		{
		// 			headers: {
		// 				...corsHeaders,
		// 				'Content-Type': 'application/json',
		// 			},
		// 			status: 400,
		// 		}
		// 	);
		// }
		// Retrieve Retell API Key from environment variables
		const retellApiKey = Deno.env.get('RETELL_API_KEY');
		const fromPhoneNumber = Deno.env.get('RETELL_FROM_NUMBER');
		if (!retellApiKey) {
			throw new Error('RETELL_API_KEY is not set in Supabase environment variables.');
		}

		const retellPayload = {
			override_agent_id: RETELL_AGENT_ID_GENERAL_WELFARE,
			to_number: trimmedPhoneNumber,
			from_number: fromPhoneNumber,

			retell_llm_dynamic_variables: {
				welfare_message: customMessage,
				service_user_name: serviceUserName,
			},
		};

		const retellResponse = await fetch(RETELL_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${retellApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(retellPayload),
		});
		if (!retellResponse.ok) {
			const errorBody = await retellResponse.text();
			console.error('Retell API Error:', errorBody);
			throw new Error(`Retell API request failed: ${retellResponse.status} ${errorBody}`);
		}
		const retellData = await retellResponse.json();
		const retellCallId = retellData.call_id || retellData.id; // Adjust based on Retell's actual response
		// 4. Log the call attempt to Supabase database
		const { error: dbError } = await supabaseAdmin.from('call_logs').insert({
			user_id: userId,
			service_user_name: serviceUserName,
			phone_number: trimmedPhoneNumber,
			custom_message: customMessage,
			status: 'SentToAPI',
			retell_call_id: retellCallId,
		});
		if (dbError) {
			console.error('Database insert error:', dbError);

			throw new Error(`Failed to log call to database: ${dbError.message}`);
		}
		return new Response(
			JSON.stringify({
				message: 'Call scheduled successfully via Retell!',
				retell_call_id: retellCallId,
			}),
			{
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				status: 200,
			}
		);
	} catch (error) {
		console.error('Error in Supabase function:', error);
		return new Response(
			JSON.stringify({
				error: error.message,
			}),
			{
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				status: 500,
			}
		);
	}
}); /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/schedule-welfare-call' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
