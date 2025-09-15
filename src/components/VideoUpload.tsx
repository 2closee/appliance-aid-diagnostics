import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Video, X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploadProps {
  onVideoSelect: (video: File) => void;
  onVideoRemove: () => void;
  selectedVideo?: File | null;
  disabled?: boolean;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ 
  onVideoSelect, 
  onVideoRemove, 
  selectedVideo, 
  disabled 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Check file size (limit to 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Video file is too large. Please select a file smaller than 50MB.');
        return;
      }
      
      onVideoSelect(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleRemoveVideo = () => {
    onVideoRemove();
    setVideoUrl(null);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatFileSize = (bytes: number) => {
    const MB = bytes / (1024 * 1024);
    return `${MB.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Upload a video showing the issue with your device (Max 50MB, MP4/WebM/MOV)
      </div>
      
      {!selectedVideo ? (
        <Card 
          className={cn(
            "border-2 border-dashed cursor-pointer transition-colors hover:border-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-lg font-semibold mb-2">Upload Video</div>
            <div className="text-sm text-muted-foreground mb-4">
              Click to select or drag and drop your video file
            </div>
            <div className="text-xs text-muted-foreground">
              Supported formats: MP4, WebM, MOV (Max 50MB)
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full max-h-64 object-contain bg-muted"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                  }}
                />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end">
                <div className="p-4 w-full">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span className="text-sm font-medium truncate max-w-48">
                        {selectedVideo.name}
                      </span>
                      <span className="text-xs bg-background/20 px-2 py-1 rounded">
                        {formatFileSize(selectedVideo.size)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={togglePlayback}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        onClick={handleRemoveVideo}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default VideoUpload;