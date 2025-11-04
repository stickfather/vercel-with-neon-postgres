import { NextResponse } from "next/server";
import { getSqlClient, normalizeRows } from "@/lib/db/client";
import { registerCheckIn, registerCheckOut } from "@/features/student-checkin/data/queries";
import { registerStaffCheckIn, registerStaffCheckOut } from "@/features/staff/data/queries";

export const dynamic = "force-dynamic";

type SyncEvent = {
  id: string;
  type: "student-checkin" | "student-checkout" | "staff-checkin" | "staff-checkout";
  payload: Record<string, unknown>;
  createdAt: number;
};

type SyncResult = {
  id: string;
  status: "success" | "failed" | "duplicate";
  error?: string;
};

/**
 * Ensures offline_event_log table exists for idempotency tracking
 */
async function ensureEventLogTable() {
  const sql = getSqlClient();
  
  await sql`
    CREATE TABLE IF NOT EXISTS public.offline_event_log (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processed', 'failed')),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0
    )
  `;
  
  // Create index if it doesn't exist
  await sql`
    CREATE INDEX IF NOT EXISTS idx_offline_event_log_status 
    ON public.offline_event_log(status)
  `;
}

/**
 * Check if an event has already been processed
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  const sql = getSqlClient();
  
  const rows = normalizeRows(await sql`
    SELECT status FROM public.offline_event_log
    WHERE id = ${eventId}
    LIMIT 1
  `);
  
  if (rows.length === 0) {
    return false;
  }
  
  const status = rows[0].status as string;
  return status === "processed";
}

/**
 * Log an event attempt
 */
async function logEventAttempt(
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: "processed" | "failed",
  errorMessage?: string
) {
  const sql = getSqlClient();
  
  await sql`
    INSERT INTO public.offline_event_log (id, event_type, payload, status, error_message, processed_at, attempts)
    VALUES (
      ${eventId},
      ${eventType},
      ${JSON.stringify(payload)},
      ${status},
      ${errorMessage ?? null},
      NOW(),
      1
    )
    ON CONFLICT (id) DO UPDATE SET
      status = ${status},
      error_message = ${errorMessage ?? null},
      processed_at = NOW(),
      attempts = public.offline_event_log.attempts + 1
  `;
}

/**
 * Process a single sync event
 */
async function processEvent(event: SyncEvent): Promise<SyncResult> {
  try {
    // Check if already processed (idempotency)
    const alreadyProcessed = await checkEventProcessed(event.id);
    if (alreadyProcessed) {
      return {
        id: event.id,
        status: "duplicate",
      };
    }

    let result;
    
    switch (event.type) {
      case "student-checkin": {
        const { studentId, level, lessonId, confirmOverride } = event.payload;
        
        if (!studentId || !level || !lessonId) {
          throw new Error("Missing required fields for student check-in");
        }
        
        result = await registerCheckIn({
          studentId: Number(studentId),
          level: String(level),
          lessonId: Number(lessonId),
          confirmOverride: Boolean(confirmOverride),
        });
        break;
      }
      
      case "student-checkout": {
        const { attendanceId } = event.payload;
        
        if (!attendanceId) {
          throw new Error("Missing attendance ID for student check-out");
        }
        
        result = await registerCheckOut(Number(attendanceId));
        break;
      }
      
      case "staff-checkin": {
        const { staffId } = event.payload;
        
        if (!staffId) {
          throw new Error("Missing staff ID for staff check-in");
        }
        
        result = await registerStaffCheckIn({
          staffId: Number(staffId),
        });
        break;
      }
      
      case "staff-checkout": {
        const { attendanceId } = event.payload;
        
        if (!attendanceId) {
          throw new Error("Missing attendance ID for staff check-out");
        }
        
        result = await registerStaffCheckOut(String(attendanceId));
        break;
      }
      
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
    
    // Log success
    await logEventAttempt(event.id, event.type, event.payload, "processed");
    
    return {
      id: event.id,
      status: "success",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for specific error cases that should be marked as failed
    const isCheckoutWithoutSession = errorMessage.toLowerCase().includes("no existe") || 
                                     errorMessage.toLowerCase().includes("ya estaba cerrada");
    
    const isDuplicateCheckin = errorMessage.toLowerCase().includes("asistencia abierta");
    
    if (isCheckoutWithoutSession || isDuplicateCheckin) {
      // Log as failed with specific error
      await logEventAttempt(event.id, event.type, event.payload, "failed", errorMessage);
      
      return {
        id: event.id,
        status: "failed",
        error: errorMessage,
      };
    }
    
    // For other errors, log but don't mark as permanently failed
    await logEventAttempt(event.id, event.type, event.payload, "failed", errorMessage);
    
    return {
      id: event.id,
      status: "failed",
      error: errorMessage,
    };
  }
}

/**
 * POST /api/offline-sync
 * Accepts an array of offline events and processes them with idempotency
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const events = body.events as SyncEvent[] | undefined;
    
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un arreglo de eventos para sincronizar." },
        { status: 400 }
      );
    }
    
    // Ensure event log table exists
    await ensureEventLogTable();
    
    // Process all events
    const results: SyncResult[] = [];
    
    for (const event of events) {
      const result = await processEvent(event);
      results.push(result);
    }
    
    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const duplicateCount = results.filter((r) => r.status === "duplicate").length;
    
    return NextResponse.json({
      success: true,
      processed: successCount,
      failed: failedCount,
      duplicates: duplicateCount,
      results,
    });
  } catch (error) {
    console.error("Error processing offline sync", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron procesar los eventos sin conexión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
