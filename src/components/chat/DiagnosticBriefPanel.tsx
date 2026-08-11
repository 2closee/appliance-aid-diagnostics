import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';

interface DiagnosticBriefPanelProps {
  brief?: string | null;
  transcript?: any;
}

export const DiagnosticBriefPanel = ({ brief, transcript }: DiagnosticBriefPanelProps) => {
  const [open, setOpen] = useState(false);
  const messages: { role: string; content: string }[] = transcript?.messages || [];
  const attachments = transcript?.attachments;

  if (!brief && messages.length === 0) return null;

  return (
    <div className="p-4 border-b bg-muted/40">
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="mt-0.5 shrink-0">
          <Bot className="h-3 w-3 mr-1" />
          AI brief
        </Badge>
        <div className="flex-1 min-w-0">
          {brief && <p className="text-sm whitespace-pre-wrap leading-relaxed">{brief}</p>}

          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => setOpen((o) => !o)}
              >
                {open ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {open ? 'Hide' : 'View'} AI diagnostic transcript ({messages.length})
              </Button>

              {open && (
                <div className="mt-2 max-h-64 overflow-y-auto space-y-2 rounded-md border bg-background p-3">
                  {messages.map((m, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-semibold">{m.role === 'user' ? 'Customer' : 'AI'}: </span>
                      <span className="whitespace-pre-wrap text-muted-foreground">{m.content}</span>
                    </div>
                  ))}

                  {attachments?.images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      {attachments.images.map((img: any, i: number) => (
                        <img
                          key={i}
                          src={typeof img === 'string' ? img : img.url}
                          alt={`Customer evidence ${i + 1}`}
                          className="h-20 w-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                  {attachments?.videos?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {attachments.videos.map((v: any, i: number) => (
                        <video key={i} src={v.url} controls className="w-full max-w-xs rounded" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticBriefPanel;
