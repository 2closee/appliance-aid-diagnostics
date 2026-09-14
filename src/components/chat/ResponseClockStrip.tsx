import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, TimerOff } from 'lucide-react';

export interface ResponseClockRow {
  id: string;
  status: string;
  expires_at: string;
  attempt_number: number;
}

interface ResponseClockStripProps {
  conversationId: string;
  isRepairCenterStaff: boolean;
  onClockChange?: (clock: ResponseClockRow | null) => void;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export const ResponseClockStrip = ({
  conversationId,
  isRepairCenterStaff,
  onClockChange,
}: ResponseClockStripProps) => {
  const [clock, setClock] = useState<ResponseClockRow | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('center_response_clocks')
      .select('id, status, expires_at, attempt_number')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = (data as ResponseClockRow) || null;
    setClock(row);
    onClockChange?.(row);
  }, [conversationId, onClockChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`response-clock-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'center_response_clocks',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  useEffect(() => {
    if (clock?.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [clock?.status]);

  if (!clock) return null;

  if (clock.status === 'expired') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/60 text-sm">
        <TimerOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {isRepairCenterStaff
            ? 'Time is up — this request was passed to another repair centre.'
            : 'This centre did not reply in time. We moved your request to another centre.'}
        </span>
      </div>
    );
  }

  if (clock.status !== 'running') return null;

  const msLeft = new Date(clock.expires_at).getTime() - now;
  const seconds = Math.max(0, Math.floor(msLeft / 1000));
  const label = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  const urgent = seconds <= 600;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b text-sm ${
        urgent ? 'bg-destructive/10' : 'bg-primary/5'
      }`}
    >
      <Clock className={`h-4 w-4 ${urgent ? 'text-destructive' : 'text-primary'}`} />
      {isRepairCenterStaff ? (
        <span>
          Respond within{' '}
          <span className="font-semibold tabular-nums">{label}</span> or this job passes to another centre.
        </span>
      ) : (
        <span>
          Awaiting price — <span className="font-semibold tabular-nums">{label}</span> left. If they miss it, we
          move you to the next best centre automatically.
        </span>
      )}
    </div>
  );
};

export default ResponseClockStrip;
