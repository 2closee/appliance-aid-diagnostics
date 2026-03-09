import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";

interface Recipient {
  name: string;
  email: string;
  id: number;
}

interface EmailComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Single recipient (backward compat)
  centerName?: string;
  centerEmail?: string;
  centerId?: number;
  // Multi-recipient
  recipients?: Recipient[];
}

const EmailComposerDialog = ({ 
  open, 
  onOpenChange, 
  centerName, 
  centerEmail,
  centerId,
  recipients,
}: EmailComposerDialogProps) => {
  const isMulti = recipients && recipients.length > 0;
  const displayName = isMulti 
    ? `${recipients.length} Repair Center${recipients.length > 1 ? 's' : ''}` 
    : centerName || '';
  
  const [subject, setSubject] = useState(`Message from FixBudi Admin`);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const targets: Recipient[] = isMulti 
        ? recipients 
        : [{ name: centerName!, email: centerEmail!, id: centerId! }];

      let sent = 0;
      let failed = 0;

      for (const target of targets) {
        try {
          const { error } = await supabase.functions.invoke('send-confirmation-email', {
            body: {
              email: target.email,
              name: target.name,
              centerName: target.name,
              type: 'custom',
              subject: subject,
              message: message,
              centerId: target.id
            }
          });
          if (error) throw error;
          sent++;
        } catch {
          failed++;
        }
        setProgress(Math.round(((sent + failed) / targets.length) * 100));
      }

      if (failed === 0) {
        toast({
          title: "Success",
          description: `Email sent to ${sent} recipient${sent > 1 ? 's' : ''}.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Sent: ${sent}, Failed: ${failed}`,
          variant: "destructive"
        });
      }

      setSubject("Message from FixBudi Admin");
      setMessage("");
      setProgress(0);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast({
        title: "Error",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recipientDisplay = isMulti 
    ? recipients.map(r => `${r.name} <${r.email}>`).join(', ')
    : centerName && centerEmail ? `${centerName} <${centerEmail}>` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Send Email to {displayName}</DialogTitle>
          <DialogDescription>
            {isMulti 
              ? `Compose and send a broadcast email to ${recipients.length} repair center${recipients.length > 1 ? 's' : ''}`
              : `Compose and send an email to ${centerEmail}`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient{isMulti && recipients.length > 1 ? 's' : ''}</Label>
            <Textarea 
              id="recipient" 
              value={recipientDisplay} 
              disabled 
              className="bg-muted text-xs max-h-20"
              rows={isMulti && recipients.length > 2 ? 3 : 1}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[120px]"
            />
          </div>

          {isLoading && progress > 0 && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposerDialog;
