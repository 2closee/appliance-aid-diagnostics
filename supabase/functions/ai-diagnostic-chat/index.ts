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
  conversationId: z.string().uuid().optional(),
  language: z.string().default('en').optional()
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
    
    const { appliance, applianceBrand, applianceModel, initialDiagnosis, messages, images, conversationId, language = 'en' } = validation.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // Add conversation messages with image support
    for (const msg of messages) {
      if (msg.role === 'user' && images && images.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }];
        
        // Add images to the first user message
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
      throw new Error(`OpenAI API error: ${await response.text()}`);
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

    let updateInfo: any = { requiresUpdate: false, confidenceScore: 0.75 };
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      try {
        updateInfo = JSON.parse(analysisData.choices[0].message.content);
      } catch (e) {
        console.error('Error parsing analysis response:', e);
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
          final_diagnosis: updateInfo.updatedDiagnosis || initialDiagnosis,
          confidence_score: updateInfo.confidenceScore || 0.75,
          language
        })
        .select()
        .single();

      if (!convError && newConv) {
        savedConversationId = newConv.id;
      }
    } else {
      // Update existing conversation
      await supabase
        .from('diagnostic_conversations')
        .update({
          final_diagnosis: updateInfo.updatedDiagnosis || initialDiagnosis,
          confidence_score: updateInfo.confidenceScore || 0.75
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
          metadata: { confidenceScore: updateInfo.confidenceScore }
        });

      // Save assistant response
      await supabase
        .from('diagnostic_messages')
        .insert({
          conversation_id: savedConversationId,
          role: 'assistant',
          content: aiResponse,
          metadata: {
            confidenceScore: updateInfo.confidenceScore,
            recommendations: updateInfo.recommendations,
            estimatedCost: {
              min: updateInfo.estimatedCostMin,
              max: updateInfo.estimatedCostMax
            }
          }
        });
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        conversationId: savedConversationId,
        updatedDiagnosis: updateInfo.requiresUpdate ? updateInfo.updatedDiagnosis : null,
        recommendations: updateInfo.recommendations || [],
        confidenceScore: updateInfo.confidenceScore || 0.75,
        estimatedCost: {
          min: updateInfo.estimatedCostMin,
          max: updateInfo.estimatedCostMax
        },
        recommendedParts: updateInfo.recommendedParts || [],
        repairUrgency: updateInfo.repairUrgency || 'medium',
        isProfessionalRepairNeeded: updateInfo.isProfessionalRepairNeeded || false
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