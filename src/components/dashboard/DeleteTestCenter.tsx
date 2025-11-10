import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const DeleteTestCenter = () => {
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const deleteTestCenter = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('delete-test-center', {
        body: { centerId: 4 } // Meranos Fixgadget
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Center Deleted",
        description: "Meranos Fixgadget and all associated data has been permanently deleted.",
      });
      setShowConfirm(false);
      window.location.reload(); // Refresh to see changes
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete test center: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2"
      >
        <AlertTriangle className="h-4 w-4" />
        Delete Test Center (Meranos Fixgadget)
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hard Delete Test Center?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will <strong>permanently delete</strong> the test center "Meranos Fixgadget" (ID: 4) and ALL associated data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>1 repair job</li>
                <li>1 conversation and messages</li>
                <li>1 settings record</li>
                <li>All staff records</li>
              </ul>
              <p className="text-destructive font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTestCenter.mutate()}
              disabled={deleteTestCenter.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTestCenter.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
