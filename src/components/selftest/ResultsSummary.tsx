import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, ArrowRight, MapPin, RotateCcw, Bot } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";
import { summarizeCounts } from "@/lib/selftest/handoff";

interface Props {
  results: TestResult[];
  onTalkToAI: () => void;
  onFindCenter: () => void;
  onRestart: () => void;
}

const statusIcon = (s: TestResult["status"]) => {
  if (s === "pass") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (s === "fail") return <XCircle className="h-5 w-5 text-destructive" />;
  return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
};

export const ResultsSummary = ({ results, onTalkToAI, onFindCenter, onRestart }: Props) => {
  const counts = summarizeCounts(results);
  const hasFailures = counts.fail > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
          {counts.pass} passed
        </Badge>
        <Badge variant={hasFailures ? "destructive" : "outline"}>
          {counts.fail} failed
        </Badge>
        <Badge variant="outline">{counts.skipped} skipped</Badge>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {results.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-4">
              {statusIcon(r.status)}
              <div className="flex-1">
                <div className="font-medium">{r.label}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {r.status}{r.detail ? ` — ${r.detail}` : ""}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {hasFailures ? (
        <div className="space-y-2">
          <p className="text-sm">
            We detected potential issues. Talk to our AI assistant for next steps, or book a repair center directly.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          All tested hardware looks healthy. If you're still having problems, it's likely a software issue — our AI can help you troubleshoot.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onTalkToAI}>
          <Bot className="mr-2 h-4 w-4" /> Talk to AI about these results <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onFindCenter}>
          <MapPin className="mr-2 h-4 w-4" /> Find a repair center
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" /> Restart
        </Button>
      </div>
    </div>
  );
};
