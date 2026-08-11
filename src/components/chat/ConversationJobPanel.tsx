import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuoteActions } from '@/hooks/useQuoteActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/currency';
import { BadgeCheck, Loader2, Search, Truck, Wrench } from 'lucide-react';

interface Job {
  id: string;
  job_status: string;
  quoted_cost: number | null;
  quote_notes: string | null;
  inspection_only: boolean;
  inspection_findings: string | null;
  appliance_type: string;
  final_cost: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Request opened',
  quote_requested: 'Quote requested',
  quote_pending_review: 'Offer awaiting your response',
  quote_accepted: 'Offer accepted',
  quote_rejected: 'Offer declined',
  quote_negotiating: 'Negotiating',
  quote_expired: 'Offer expired',
  diagnostics_requested: 'Physical diagnostics requested',
  diagnostics_completed: 'Inspection done',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  in_repair: 'In repair',
  repair_completed: 'Repair completed',
  ready_for_return: 'Ready for return',
  returned: 'Returned',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cost_adjustment_pending: 'Cost adjustment pending',
};

interface ConversationJobPanelProps {
  conversationId: string;
  repairCenterId?: number;
}

export const ConversationJobPanel = ({ conversationId, repairCenterId }: ConversationJobPanelProps) => {
  const { isRepairCenterStaff } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { acceptQuote, rejectQuote, negotiateQuote } = useQuoteActions() as any;

  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [turnaround, setTurnaround] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [findings, setFindings] = useState('');
  const [findingsPrice, setFindingsPrice] = useState('');

  const loadJob = useCallback(async () => {
    const { data } = await supabase
      .from('repair_jobs')
      .select('id, job_status, quoted_cost, quote_notes, inspection_only, inspection_findings, appliance_type, final_cost')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setJob((data as Job) || null);
  }, [conversationId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    const channel = supabase
      .channel(`conv-job-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_jobs', filter: `conversation_id=eq.${conversationId}` },
        () => loadJob(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadJob]);

  const callCenterOffer = async (body: Record<string, unknown>, successMessage: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('center-offer', {
        body: { conversation_id: conversationId, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: successMessage });
      setOfferOpen(false);
      setInspectOpen(false);
      setFindingsOpen(false);
      await loadJob();
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const statusStrip = job ? (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline">{STATUS_LABELS[job.job_status] || job.job_status}</Badge>
      {job.inspection_only && <Badge variant="secondary">Inspection first</Badge>}
      {!!job.quoted_cost && (
        <span className="text-sm font-medium">Offer: {formatCurrency(Number(job.quoted_cost))}</span>
      )}
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">No repair job yet — discuss the fault, then send an offer.</span>
  );

  // ---- Repair center staff view ----
  if (isRepairCenterStaff) {
    return (
      <div className="p-3 border-b bg-background flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {statusStrip}
        <div className="flex gap-2 flex-wrap">
          <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={busy}>
                <Wrench className="h-4 w-4 mr-2" />
                Send offer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send a repair offer</DialogTitle>
                <DialogDescription>
                  The customer gets an offer card in this chat. Accepting it moves them to pickup scheduling.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Repair price (₦)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Turnaround in days (optional)"
                  value={turnaround}
                  onChange={(e) => setTurnaround(e.target.value)}
                />
                <Textarea
                  placeholder="Parts, scope of work, warranty notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={busy || !price}
                  onClick={() =>
                    callCenterOffer(
                      {
                        mode: 'offer',
                        quoted_cost: Number(price),
                        turnaround_days: turnaround ? Number(turnaround) : null,
                        quote_notes: notes || null,
                      },
                      'Offer sent to the customer',
                    )
                  }
                >
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send offer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy}>
                <Search className="h-4 w-4 mr-2" />
                Request physical diagnostics
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request physical diagnostics</DialogTitle>
                <DialogDescription>
                  No repair price yet. The customer schedules pickup and pays only the delivery fee; you post the
                  inspection result here afterwards.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Why the device must be inspected in person..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <DialogFooter>
                <Button
                  disabled={busy}
                  onClick={() =>
                    callCenterOffer(
                      { mode: 'inspection', inspection_reason: reason || null },
                      'Physical diagnostics requested',
                    )
                  }
                >
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Request diagnostics
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {job?.inspection_only && (
            <Dialog open={findingsOpen} onOpenChange={setFindingsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={busy}>
                  <BadgeCheck className="h-4 w-4 mr-2" />
                  Post inspection result
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Physical diagnostics result</DialogTitle>
                  <DialogDescription>
                    Share what you found. Add a price to turn it into a firm offer the customer can accept.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    placeholder="What you found during inspection..."
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Repair price (₦) — optional"
                    value={findingsPrice}
                    onChange={(e) => setFindingsPrice(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    disabled={busy || !findings}
                    onClick={() =>
                      callCenterOffer(
                        {
                          mode: 'findings',
                          inspection_findings: findings,
                          quoted_cost: findingsPrice ? Number(findingsPrice) : null,
                        },
                        'Inspection result sent',
                      )
                    }
                  >
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send result
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  // ---- Customer view ----
  if (!job) return null;

  const awaitingResponse = job.job_status === 'quote_pending_review' && !!job.quoted_cost;
  const readyForPickup =
    job.job_status === 'quote_accepted' || job.job_status === 'diagnostics_requested';

  const handleSchedulePickup = () => {
    navigate('/pickup-request', {
      state: {
        existingJobId: job.id,
        selectedCenter: repairCenterId ? { id: repairCenterId } : undefined,
        applianceType: job.appliance_type,
        issueDescription: job.quote_notes || undefined,
      },
    });
  };

  return (
    <div className="p-3 border-b bg-background space-y-3">
      {statusStrip}

      {job.inspection_findings && (
        <p className="text-sm bg-muted/50 p-2 rounded whitespace-pre-wrap">
          <span className="font-medium">Inspection result: </span>
          {job.inspection_findings}
        </p>
      )}

      {awaitingResponse && (
        <div className="rounded-lg border p-3 space-y-3">
          <div>
            <p className="font-semibold">Repair offer: {formatCurrency(Number(job.quoted_cost))}</p>
            {job.quote_notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{job.quote_notes}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await acceptQuote(job.id);
                setBusy(false);
                await loadJob();
                if (res?.success) handleSchedulePickup();
              }}
            >
              Accept offer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await negotiateQuote?.(job.id, 'Customer wants to negotiate the offer');
                setBusy(false);
                await loadJob();
              }}
            >
              Counter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await rejectQuote(job.id);
                setBusy(false);
                await loadJob();
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {readyForPickup && (
        <div className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm">
            {job.job_status === 'diagnostics_requested'
              ? 'The center needs to inspect your device. You only pay the pickup/delivery fee.'
              : 'Offer accepted — schedule your device pickup to continue.'}
          </p>
          <Button size="sm" onClick={handleSchedulePickup}>
            <Truck className="h-4 w-4 mr-2" />
            Schedule pickup
          </Button>
        </div>
      )}

      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/repair-jobs/${job.id}`)}>
        View full job details
      </Button>
    </div>
  );
};

export default ConversationJobPanel;
