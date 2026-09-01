import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { START_TOUR_EVENT, TOURS, tourKeyForRole } from "./tours";
import { X } from "lucide-react";

type Rect = { top: number; left: number; width: number; height: number };

const spotlightPadding = 8;

/**
 * Guided walkthrough overlay. Auto-plays once per role for a signed-in user and
 * can be replayed on demand via the `fixbudi:start-tour` window event.
 */
const WalkthroughTour = () => {
  const { user, userRole, rolesLoaded } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const tourKey = tourKeyForRole(userRole);
  const steps = TOURS[tourKey].steps;
  const step = steps[stepIndex];

  // Manual replay
  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
  }, []);

  // Auto-play once per role
  useEffect(() => {
    if (!user || !rolesLoaded) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("id, completed_at, skipped")
        .eq("user_id", user.id)
        .eq("tour_key", tourKey)
        .maybeSingle();
      if (!active || data) return;
      setStepIndex(0);
      setOpen(true);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, rolesLoaded, tourKey]);

  // Track the spotlight target position
  useEffect(() => {
    if (!open || !step) return;

    const measure = () => {
      if (!step.target) return setRect(null);
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el || el.offsetParent === null) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  const persist = useCallback(
    async (payload: { skipped: boolean }) => {
      if (!user) return;
      await supabase.from("user_onboarding").upsert(
        {
          user_id: user.id,
          tour_key: tourKey,
          last_step: stepIndex,
          skipped: payload.skipped,
          completed_at: payload.skipped ? null : new Date().toISOString(),
        },
        { onConflict: "user_id,tour_key" },
      );
    },
    [user, tourKey, stepIndex],
  );

  const finish = useCallback(
    (skipped: boolean) => {
      setOpen(false);
      void persist({ skipped });
    },
    [persist],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !step) return null;

  const isLast = stepIndex === steps.length - 1;

  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.top + rect.height + 16, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left, 16), Math.max(window.innerWidth - 360, 16)),
      }
    : {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={TOURS[tourKey].label}>
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-[1px]" onClick={() => finish(true)} />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-lg ring-4 ring-primary shadow-[0_0_0_9999px_hsl(var(--foreground)/0.6)]"
          style={{
            top: rect.top - spotlightPadding,
            left: rect.left - spotlightPadding,
            width: rect.width + spotlightPadding * 2,
            height: rect.height + spotlightPadding * 2,
          }}
        />
      )}

      <div
        className="absolute w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-xl"
        style={cardStyle}
      >
        <button
          type="button"
          onClick={() => finish(true)}
          aria-label="Skip tour"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-1 pr-6 text-lg font-semibold">{step.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => finish(true)}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStepIndex((i) => i - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => (isLast ? finish(false) : setStepIndex((i) => i + 1))}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WalkthroughTour;
