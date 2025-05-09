// supabase/functions/make-call/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// These would ideally be set as environment variables in Supabase
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceUserName, phoneNumber, customMessage, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    // Construct TwiML. For a real app, this URL should point to a TwiML bin or another function.
    // For simplicity here, we'll use a TwiML Bin URL or a simple Say.
    // A more robust solution would be a TwiML Bin URL that hosts the <Say> and <Gather>
    // For this demo, let's just make it say the message.
    // To make it interactive: use a TwiML Bin URL in `Url` param instead of `Twiml`
    // TwiML Bin content:
    // <Response>
    //   <Say>${customMessage}</Say>
    //   <Gather input="dtmf" numDigits="1" timeout="10" action="/handle-dtmf"> // /handle-dtmf would be another function
    //     <Say>Press 1 if you are fine.</Say>
    //   </Gather>
    //   <Say>We didn't receive a response. Goodbye.</Say>
    // </Response>
    const twimlContent = `<Response><Say>${customMessage} Press 1 if you are fine, or hang up.</Say></Response>`;

    const callData = new URLSearchParams();
    callData.append("To", phoneNumber);
    callData.append("From", TWILIO_PHONE_NUMBER);
    callData.append("Twiml", twimlContent); // Or use 'Url' for a TwiML Bin

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Twilio API error:", errorData);
      throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    const callSid = responseData.sid;

    // Store call attempt in Supabase
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseAdmin.from("calls").insert({
      user_id: userId,
      service_user_name: serviceUserName,
      phone_number: phoneNumber,
      message: customMessage,
      status: "Initiated",
      call_sid: callSid,
      api_response: responseData,
    });

    if (dbError) {
      console.error("Supabase DB error:", dbError);
      throw new Error(`Supabase DB error: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ success: true, callSid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in make-call function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
