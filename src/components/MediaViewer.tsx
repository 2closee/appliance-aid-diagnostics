import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Image as ImageIcon, AudioLines, X, ZoomIn } from "lucide-react";
import { useState } from "react";

interface MediaAttachment {
  type: 'video' | 'image' | 'audio';
  url: string;
  description?: string;
  uploaded_at?: string;
  transcription?: string;
}

interface MediaViewerProps {
  attachments: MediaAttachment[];
  open: boolean;
  onClose: () => void;
}

export const MediaViewer = ({ attachments, open, onClose }: MediaViewerProps) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment | null>(null);

  const videos = attachments.filter(a => a.type === 'video');
  const images = attachments.filter(a => a.type === 'image');
  const audio = attachments.filter(a => a.type === 'audio');

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnostic Media</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Videos */}
            {videos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Videos ({videos.length})</h3>
                </div>
                <div className="grid gap-4">
                  {videos.map((video, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      {video.description && (
                        <p className="text-sm text-muted-foreground mb-2">{video.description}</p>
                      )}
                      <video 
                        src={video.url} 
                        controls 
                        className="w-full rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Images ({images.length})</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, idx) => (
                    <div key={idx} className="relative group cursor-pointer" onClick={() => setSelectedMedia(image)}>
                      <img 
                        src={image.url} 
                        alt={image.description || `Image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white" />
                      </div>
                      {image.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{image.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio */}
            {audio.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AudioLines className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Audio ({audio.length})</h3>
                </div>
                <div className="space-y-4">
                  {audio.map((audioItem, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <audio src={audioItem.url} controls className="w-full mb-2" />
                      {audioItem.transcription && (
                        <div className="bg-muted p-3 rounded text-sm">
                          <Badge variant="outline" className="mb-2">Transcription</Badge>
                          <p className="text-muted-foreground">{audioItem.transcription}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size image viewer */}
      {selectedMedia && selectedMedia.type === 'image' && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>{selectedMedia.description || 'Image'}</DialogTitle>
            </DialogHeader>
            <img 
              src={selectedMedia.url} 
              alt={selectedMedia.description || 'Full size'}
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
