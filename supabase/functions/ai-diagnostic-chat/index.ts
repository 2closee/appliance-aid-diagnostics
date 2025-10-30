import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  appliance: z.string().min(1).max(100),
  applianceBrand: z.string().optional(),
  applianceModel: z.string().optional(),
  initialDiagnosis: z.string().min(1).max(2000),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(5000)
  })).max(50),
  images: z.array(z.string()).optional(), // Base64 or URLs
  conversationId: z.string().uuid().nullable().optional(),
  language: z.string().default('en').optional()
});

// Helper function to call n8n AI agent
async function callN8NAgent(params: {
  conversationId: string | null,
  appliance: string,
  applianceBrand?: string,
  applianceModel?: string,
  initialDiagnosis: string,
  messages: any[],
  images?: string[],
  language: string
}) {
  const { conversationId, appliance, applianceBrand, applianceModel, initialDiagnosis, messages, images, language } = params;
  
  const payload = {
    sessionId: conversationId || crypto.randomUUID(),
    appliance,
    applianceBrand,
    applianceModel,
    initialDiagnosis,
    messages,
    images: images || [],
    language
  };

  console.log('Calling n8n webhook...');
  const response = await fetch(Deno.env.get('N8N_WEBHOOK_URL')!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000) // 30s timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('n8n response received successfully');
  
  return {
    response: data.response || data.message || data.content || '',
    confidenceScore: data.confidenceScore || 0.8,
    recommendations: data.recommendations || [],
    estimatedCostMin: data.estimatedCostMin || null,
    estimatedCostMax: data.estimatedCostMax || null,
    recommendedParts: data.recommendedParts || [],
    repairUrgency: data.repairUrgency || 'medium',
    isProfessionalRepairNeeded: data.isProfessionalRepairNeeded || false,
    updatedDiagnosis: data.updatedDiagnosis || null,
    provider: 'n8n'
  };
}

// Helper function to call OpenAI (fallback)
async function callOpenAI(params: {
  appliance: string,
  applianceBrand?: string,
  applianceModel?: string,
  initialDiagnosis: string,
  messages: any[],
  images?: string[],
  language: string
}) {
  const { appliance, applianceBrand, applianceModel, initialDiagnosis, messages, images, language } = params;

  const brandModelContext = applianceBrand && applianceModel 
    ? `\n\nDevice Details: ${applianceBrand} ${applianceModel}. Use manufacturer-specific knowledge when available.`
    : '';

  const systemPrompt = `You are an expert diagnostic AI assistant for electronic devices. You are helping diagnose issues with a ${appliance}.${brandModelContext}

Initial diagnosis was: "${initialDiagnosis}"

Your role:
1. Ask follow-up questions to better understand the specific issues
2. Analyze any images, video or audio attachments provided
3. Provide detailed technical insights with confidence scores
4. Suggest specific troubleshooting steps
5. Determine if the issue is software or hardware related
6. Recommend whether professional repair is needed
7. Estimate repair costs when possible (low/medium/high range)
8. Suggest specific replacement parts when applicable
9. Assess repair urgency (low/medium/high/critical)

When analyzing images:
- Identify visible damage, wear, or anomalies
- Note specific component issues
- Provide detailed observations

Be professional, empathetic, and technically accurate. Focus on providing actionable advice.

If you determine the issue needs professional repair, mention that the shared media will be helpful for repair technicians.

Language preference: ${language}`;

  // Prepare messages with vision support
  const aiMessages: any[] = [{ role: 'system', content: systemPrompt }];
  
  for (const msg of messages) {
    if (msg.role === 'user' && images && images.length > 0) {
      const content: any[] = [{ type: 'text', text: msg.content }];
      
      for (const imageUrl of images) {
        content.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      }
      
      aiMessages.push({ role: msg.role, content });
    } else {
      aiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  console.log('Calling OpenAI API...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: images && images.length > 0 ? 'gpt-4o' : 'gpt-4o-mini',
      messages: aiMessages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Enhanced analysis with confidence, cost estimation, and parts recommendation
  const analysisPrompt = `Based on this conversation about a ${appliance}${brandModelContext}, provide comprehensive diagnostic analysis.

Original diagnosis: "${initialDiagnosis}"
Latest AI response: "${aiResponse}"

Provide a JSON response with:
{
  "requiresUpdate": boolean,
  "updatedDiagnosis": "string (if update needed)",
  "confidenceScore": 0.0-1.0,
  "recommendations": ["array", "of", "strings"],
  "estimatedCostMin": number (in USD, null if unknown),
  "estimatedCostMax": number (in USD, null if unknown),
  "recommendedParts": [{"name": "string", "partNumber": "string", "estimatedCost": number}],
  "repairUrgency": "low|medium|high|critical",
  "isProfessionalRepairNeeded": boolean
}

Be realistic with cost estimates based on typical repair costs. Only include parts if confident about specific replacements needed.`;

  console.log('Getting OpenAI analysis...');
  const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  let updateInfo: any = { requiresUpdate: false, confidenceScore: 0.75 };
  if (analysisResponse.ok) {
    const analysisData = await analysisResponse.json();
    try {
      updateInfo = JSON.parse(analysisData.choices[0].message.content);
    } catch (e) {
      console.error('Error parsing OpenAI analysis response:', e);
    }
  }

  console.log('OpenAI response received successfully');

  return {
    response: aiResponse,
    confidenceScore: updateInfo.confidenceScore || 0.75,
    recommendations: updateInfo.recommendations || [],
    estimatedCostMin: updateInfo.estimatedCostMin,
    estimatedCostMax: updateInfo.estimatedCostMax,
    recommendedParts: updateInfo.recommendedParts || [],
    repairUrgency: updateInfo.repairUrgency || 'medium',
    isProfessionalRepairNeeded: updateInfo.isProfessionalRepairNeeded || false,
    updatedDiagnosis: updateInfo.updatedDiagnosis || null,
    provider: 'openai'
  };
}

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
    
    const { appliance, applianceBrand, applianceModel, initialDiagnosis, messages, images, conversationId, language = 'en' } = validation.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try n8n first (PRIMARY)
    let aiResult;
    let usedFallback = false;

    try {
      console.log('Attempting n8n AI agent (PRIMARY)...');
      aiResult = await callN8NAgent({
        conversationId,
        appliance,
        applianceBrand,
        applianceModel,
        initialDiagnosis,
        messages,
        images,
        language
      });
      console.log('✓ n8n AI successful');
    } catch (n8nError) {
      console.warn('✗ n8n failed, falling back to OpenAI:', n8nError);
      usedFallback = true;
      
      try {
        console.log('Attempting OpenAI fallback (BACKUP)...');
        aiResult = await callOpenAI({
          appliance,
          applianceBrand,
          applianceModel,
          initialDiagnosis,
          messages,
          images,
          language
        });
        console.log('✓ OpenAI fallback successful');
      } catch (openAIError) {
        console.error('✗ Both AI agents failed:', openAIError);
        return new Response(
          JSON.stringify({ 
            error: 'AI diagnostic service unavailable. Please try again later.',
            details: 'Both primary and fallback AI services failed.'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Save conversation and messages to database
    let savedConversationId = conversationId;
    
    if (!conversationId) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('diagnostic_conversations')
        .insert({
          user_id: null, // Will be set on client side if authenticated
          appliance_type: appliance,
          appliance_brand: applianceBrand,
          appliance_model: applianceModel,
          initial_diagnosis: initialDiagnosis,
          final_diagnosis: aiResult.updatedDiagnosis || initialDiagnosis,
          confidence_score: aiResult.confidenceScore,
          language
        })
        .select()
        .single();

      if (!convError && newConv) {
        savedConversationId = newConv.id;
      } else {
        console.error('Error creating conversation:', convError);
      }
    } else {
      // Update existing conversation
      await supabase
        .from('diagnostic_conversations')
        .update({
          final_diagnosis: aiResult.updatedDiagnosis || initialDiagnosis,
          confidence_score: aiResult.confidenceScore
        })
        .eq('id', conversationId);
    }

    // Save messages if we have a conversation
    if (savedConversationId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      await supabase
        .from('diagnostic_messages')
        .insert({
          conversation_id: savedConversationId,
          role: lastMessage.role,
          content: lastMessage.content,
          attachments: images ? { images } : null,
          metadata: { 
            confidenceScore: aiResult.confidenceScore,
            aiProvider: aiResult.provider,
            usedFallback
          }
        });

      // Save assistant response
      await supabase
        .from('diagnostic_messages')
        .insert({
          conversation_id: savedConversationId,
          role: 'assistant',
          content: aiResult.response,
          metadata: {
            aiProvider: aiResult.provider,
            usedFallback,
            confidenceScore: aiResult.confidenceScore,
            recommendations: aiResult.recommendations,
            estimatedCost: {
              min: aiResult.estimatedCostMin,
              max: aiResult.estimatedCostMax
            },
            repairUrgency: aiResult.repairUrgency,
            isProfessionalRepairNeeded: aiResult.isProfessionalRepairNeeded
          }
        });
    }

    return new Response(
      JSON.stringify({
        response: aiResult.response,
        conversationId: savedConversationId,
        updatedDiagnosis: aiResult.updatedDiagnosis,
        recommendations: aiResult.recommendations,
        confidenceScore: aiResult.confidenceScore,
        estimatedCost: {
          min: aiResult.estimatedCostMin,
          max: aiResult.estimatedCostMax
        },
        recommendedParts: aiResult.recommendedParts,
        repairUrgency: aiResult.repairUrgency,
        isProfessionalRepairNeeded: aiResult.isProfessionalRepairNeeded,
        aiProvider: aiResult.provider,
        usedFallback
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
