import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  appliance: z.string().min(1).max(100),
  initialDiagnosis: z.string().min(1).max(2000),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(5000)
  })).max(50),
  attachments: z.any().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input data', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { appliance, initialDiagnosis, messages, attachments } = validation.data;

    const systemPrompt = `You are an expert diagnostic AI assistant for electronic devices. You are helping diagnose issues with a ${appliance}.

Initial diagnosis was: "${initialDiagnosis}"

Your role:
1. Ask follow-up questions to better understand the specific issues
2. Analyze any video or audio attachments if mentioned
3. Provide detailed technical insights
4. Suggest specific troubleshooting steps
5. Determine if the issue is software or hardware related
6. Recommend whether professional repair is needed

If the user has shared video or audio attachments, acknowledge them and ask specific questions about what they show.

Be professional, empathetic, and technically accurate. Focus on providing actionable advice.

If you determine the issue needs professional repair, mention that the shared media will be helpful for repair technicians.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Analyze if diagnosis should be updated
    const analysisPrompt = `Based on this conversation about a ${appliance}, should the diagnosis be updated?

Original diagnosis: "${initialDiagnosis}"
Latest AI response: "${aiResponse}"

If yes, provide:
1. updatedDiagnosis: A concise updated diagnosis
2. recommendations: Array of specific recommendations
3. requiresUpdate: true

If no update needed, return: {"requiresUpdate": false}

Respond with valid JSON only.`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    let updateInfo = { requiresUpdate: false };
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      try {
        updateInfo = JSON.parse(analysisData.choices[0].message.content);
      } catch (e) {
        console.error('Error parsing analysis response:', e);
      }
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        updatedDiagnosis: updateInfo.requiresUpdate ? (updateInfo as any).updatedDiagnosis : null,
        recommendations: updateInfo.requiresUpdate ? (updateInfo as any).recommendations : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-diagnostic-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});