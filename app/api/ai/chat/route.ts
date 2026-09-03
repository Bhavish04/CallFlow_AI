import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processConversationTurn } from '@/lib/ai-agent';
import { evaluateWorkflowState } from '@/lib/workflow-engine';
import { Workflow, Business, Conversation, TranscriptMessage } from '@/types/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, conversationId, message, calendarStatus: inputCalendarStatus } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Load selected workflow
    const { data: workflowData, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflowData) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    const workflow = workflowData as Workflow;

    // 2. Load business profile
    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', workflow.business_id)
      .single();

    if (bizError || !bizData) {
      return NextResponse.json({ error: 'Associated business profile not found' }, { status: 404 });
    }
    const business = bizData as Business;

    // SCENARIO A: INITIALIZE NEW SIMULATION CONVERSATION
    if (!conversationId || !message || !message.trim()) {
      const initialTranscript: TranscriptMessage[] = [
        {
          role: 'assistant',
          content: workflow.greeting,
          timestamp: new Date().toISOString(),
        },
      ];

      const newConvPayload: Record<string, unknown> = {
        business_id: business.id,
        workflow_id: workflow.id,
        phone: '+1 (555) 019-2831',
        status: 'in_progress',
        priority: 'normal',
        collected_data: {},
        transcript: initialTranscript,
        customer_name: null,
        intent: null,
        summary: null,
        action_performed: null,
      };

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        // @ts-ignore Supabase insert payload
        .insert(newConvPayload as any)
        .select()
        .single();

      if (createError || !newConv) {
        console.error('Error initializing conversation:', createError);
        const detail = createError?.message || 'Database insert failed';
        return NextResponse.json(
          { error: `Failed to initialize conversation in database: ${detail}` },
          { status: 500 }
        );
      }

      const conv = newConv as Conversation;
      const initialEval = evaluateWorkflowState(workflow, {}, business.timezone);

      return NextResponse.json({
        conversationId: conv.id,
        reply: workflow.greeting,
        intent: null,
        customerName: null,
        collectedData: {},
        missingFields: initialEval.missingRequiredFields.map((q) => q.name),
        workflowComplete: initialEval.isComplete,
        priority: initialEval.priority,
        summary: null,
        actionRequired: false,
        actionType: null,
        actionOperation: null,
        calendarStatus: 'IDLE',
        calendarEventId: null,
        calendarError: null,
        transcript: initialTranscript,
      });
    }

    // SCENARIO B: CONTINUE EXISTING CONVERSATION
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !convData) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = convData as Conversation;
    const existingTranscript: TranscriptMessage[] = Array.isArray(conversation.transcript)
      ? (conversation.transcript as TranscriptMessage[])
      : [];
    const existingCollectedData: Record<string, unknown> =
      (conversation.collected_data as Record<string, unknown>) || {};

    const userMsgObj: TranscriptMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // BACKEND COMPLETED SAFEGUARD: If conversation is already completed, return completed state WITHOUT calling Groq or Calendar API
    if (conversation.status === 'completed') {
      let isHindi = /[\u0900-\u097F]/.test(message);
      let ackText = "You're welcome! Your booking is confirmed.";
      if (isHindi) {
        ackText = 'आपका स्वागत है! आपकी बुकिंग कन्फर्म हो चुकी है। धन्यवाद!';
      }

      const assistantMsgObj: TranscriptMessage = {
        role: 'assistant',
        content: ackText,
        timestamp: new Date().toISOString(),
      };
      const finalTranscript = [...existingTranscript, userMsgObj, assistantMsgObj];

      await supabase
        .from('conversations')
        // @ts-ignore Supabase update payload
        .update({ transcript: finalTranscript } as any)
        .eq('id', conversationId);

      return NextResponse.json({
        conversationId: conversation.id,
        reply: ackText,
        intent: conversation.intent,
        customerName: conversation.customer_name,
        collectedData: existingCollectedData,
        missingFields: [],
        workflowComplete: true,
        priority: conversation.priority,
        summary: conversation.summary,
        actionRequired: false,
        actionType: null,
        actionOperation: null,
        calendarStatus: conversation.calendar_event_id ? 'EVENT_CREATED' : 'IDLE',
        calendarEventId: conversation.calendar_event_id,
        calendarError: null,
        transcript: finalTranscript,
      });
    }

    const updatedTranscript = [...existingTranscript, userMsgObj];

    // Process turn with AI Agent & Google Calendar Tool Calling
    console.log('[Browser Chat API Diagnostic] Request Received:');
    console.log(`  - workflowId: ${workflowId}`);
    console.log(`  - conversationId: ${conversationId}`);
    console.log(`  - userMessage: "${message.trim()}"`);
    console.log(`  - existingCollectedData BEFORE turn:`, JSON.stringify(existingCollectedData));
    console.log(`  - business.timezone: ${business.timezone}`);

    let agentResult;
    try {
      agentResult = await processConversationTurn({
        business,
        workflow,
        existingTranscript: updatedTranscript,
        existingCollectedData,
        userMessage: message.trim(),
        calendarEventId: conversation.calendar_event_id,
        calendarStatus: inputCalendarStatus || 'IDLE',
      });
    } catch (aiErr: unknown) {
      console.error('[Browser Chat API Diagnostic Error] Turn Error:', aiErr);
      const rawMsg = aiErr instanceof Error ? aiErr.message : 'AI Processing Failed';
      const safeMsg = rawMsg.replace(/(gsk_|sk-or-|sk-)[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]');
      return NextResponse.json({ error: safeMsg }, { status: 500 });
    }

    console.log('[Browser Chat API Diagnostic] Result AFTER turn:');
    console.log(`  - mergedCollectedData:`, JSON.stringify(agentResult.mergedCollectedData));
    console.log(`  - extracted date value: "${agentResult.mergedCollectedData.date}"`);
    console.log(`  - extracted time value: "${agentResult.mergedCollectedData.time}"`);
    console.log(`  - calendarStatus: ${agentResult.calendarStatus}`);
    console.log(`  - calendarError: ${agentResult.calendarError}`);
    console.log(`  - workflowComplete: ${agentResult.workflowComplete}`);

    const assistantMsgObj: TranscriptMessage = {
      role: 'assistant',
      content: agentResult.reply,
      timestamp: new Date().toISOString(),
    };
    const finalTranscript = [...updatedTranscript, assistantMsgObj];

    const finalStatus = agentResult.workflowComplete ? 'completed' : 'in_progress';
    const actionPerformed = agentResult.calendarStatus
      ? `google_calendar:${agentResult.calendarStatus.toLowerCase()}`
      : agentResult.actionRequired
      ? `${agentResult.actionType}:${agentResult.actionOperation}`
      : conversation.action_performed;

    const updatePayload: Record<string, unknown> = {
      collected_data: agentResult.mergedCollectedData,
      transcript: finalTranscript,
      customer_name: agentResult.customerName || conversation.customer_name,
      intent: agentResult.intent || conversation.intent,
      priority: agentResult.priority || conversation.priority,
      status: finalStatus,
      summary: agentResult.summary || conversation.summary,
      action_performed: actionPerformed,
    };

    const targetCalId = agentResult.calendarEventId || conversation.calendar_event_id;
    if (targetCalId) {
      updatePayload.calendar_event_id = targetCalId;
    }

    const { error: updateError } = await supabase
      .from('conversations')
      // @ts-ignore Supabase update payload
      .update(updatePayload as any)
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation row:', updateError);
    }

    return NextResponse.json({
      conversationId: conversation.id,
      reply: agentResult.reply,
      intent: agentResult.intent || conversation.intent,
      customerName: agentResult.customerName || conversation.customer_name,
      collectedData: agentResult.mergedCollectedData,
      missingFields: agentResult.missingFields,
      workflowComplete: agentResult.workflowComplete,
      priority: agentResult.priority,
      summary: agentResult.summary || conversation.summary,
      actionRequired: agentResult.actionRequired,
      actionType: agentResult.actionType,
      actionOperation: agentResult.actionOperation,
      calendarStatus: agentResult.calendarStatus || 'IDLE',
      calendarEventId: agentResult.calendarEventId || conversation.calendar_event_id,
      calendarError: agentResult.calendarError || null,
      bookingTicket: agentResult.bookingTicket || (existingCollectedData._booking_ticket as any) || null,
      transcript: finalTranscript,
    });
  } catch (err: unknown) {
    console.error('AI Chat API Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
