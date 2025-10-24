import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Video,
  AudioLines,
  Camera,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceRecorder from './VoiceRecorder';
import VideoUpload from './VideoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'video' | 'audio' | 'image';
    url: string;
    name: string;
  }[];
  metadata?: {
    confidenceScore?: number;
    estimatedCost?: { min?: number; max?: number };
    recommendedParts?: any[];
    repairUrgency?: string;
  };
}

interface AIChatInterfaceProps {
  appliance: string;
  applianceBrand?: string;
  applianceModel?: string;
  initialDiagnosis: string;
  language?: string;
  onDiagnosisUpdate?: (newDiagnosis: string, report?: any) => void;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ 
  appliance,
  applianceBrand,
  applianceModel,
  initialDiagnosis,
  language = 'en',
  onDiagnosisUpdate 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `I understand you're having issues with your ${appliance}. Based on the initial diagnosis: "${initialDiagnosis}". Can you tell me more about what specific problems you're experiencing that weren't covered in the diagnosis?`,
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uploadVideo = async (videoFile: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const fileName = `${user.id}/diagnostic-videos/${Date.now()}-${videoFile.name}`;
    
    const { data, error } = await supabase.storage
      .from('diagnostic-attachments')
      .upload(fileName, videoFile);

    if (error) throw error;

    // Use signed URL for private bucket
    const { data: urlData, error: urlError } = await supabase.storage
      .from('diagnostic-attachments')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (urlError) throw urlError;

    return urlData.signedUrl;
  };

  const uploadAudio = async (audioBlob: Blob): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const fileName = `${user.id}/diagnostic-audio/${Date.now()}-recording.webm`;
    
    const { data, error } = await supabase.storage
      .from('diagnostic-attachments')
      .upload(fileName, audioBlob);

    if (error) throw error;

    // Use signed URL for private bucket
    const { data: urlData, error: urlError } = await supabase.storage
      .from('diagnostic-attachments')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (urlError) throw urlError;

    return urlData.signedUrl;
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (error) throw error;
      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return '';
    }
  };

  const handleSendMessage = async (content: string, attachments: Message['attachments'] = []) => {
    if (!content.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content || (attachments.length > 0 ? 'Shared attachments' : ''),
      timestamp: new Date(),
      attachments
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Convert image attachments to base64
      const imageUrls = attachments
        .filter(a => a.type === 'image')
        .map(a => a.url);

      const { data, error } = await supabase.functions.invoke('ai-diagnostic-chat', {
        body: {
          appliance,
          applianceBrand,
          applianceModel,
          initialDiagnosis,
          messages: [...messages, userMessage].map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          images: imageUrls.length > 0 ? imageUrls : undefined,
          conversationId: conversationId ?? undefined,
          language
        }
      });

      if (error) throw error;

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          confidenceScore: data.confidenceScore,
          estimatedCost: data.estimatedCost,
          recommendedParts: data.recommendedParts,
          repairUrgency: data.repairUrgency
        }
      };

      setMessages(prev => [...prev, aiResponse]);

      const report = {
        diagnosis: data.updatedDiagnosis || initialDiagnosis,
        confidenceScore: data.confidenceScore,
        recommendations: data.recommendations,
        estimatedCost: data.estimatedCost,
        recommendedParts: data.recommendedParts,
        repairUrgency: data.repairUrgency,
        isProfessionalRepairNeeded: data.isProfessionalRepairNeeded
      };
      setCurrentReport(report);

      if (data.updatedDiagnosis && onDiagnosisUpdate) {
        onDiagnosisUpdate(data.updatedDiagnosis, report);
        toast({
          title: "Diagnosis Updated",
          description: `Confidence: ${Math.round((data.confidenceScore || 0.75) * 100)}%`,
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedImages([]);
    }
  };

  const handleTextSubmit = async () => {
    if (!newMessage.trim() && selectedImages.length === 0 && !selectedVideo) return;

    const attachments: Message['attachments'] = [];

    // Handle images
    if (selectedImages.length > 0) {
      for (const file of selectedImages) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachments.push({ type: 'image', url: base64, name: file.name });
      }
    }

    // Handle video
    if (selectedVideo) {
      const videoUrl = await uploadVideo(selectedVideo);
      attachments.push({ type: 'video', url: videoUrl, name: selectedVideo.name });
      setSelectedVideo(null);
    }

    await handleSendMessage(newMessage, attachments);
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      const transcription = await transcribeAudio(audioBlob);
      const audioUrl = await uploadAudio(audioBlob);
      
      const attachments: Message['attachments'] = [{
        type: 'audio',
        url: audioUrl,
        name: 'Voice message'
      }];

      await handleSendMessage(transcription, attachments);
    } catch (error) {
      console.error('Error processing voice recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoSelect = (video: File) => {
    setSelectedVideo(video);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages = Array.from(files).slice(0, 3);
      setSelectedImages(prev => [...prev, ...newImages].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const renderAttachment = (attachment: NonNullable<Message['attachments']>[0]) => {
    if (attachment.type === 'video') {
      return (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Video className="h-4 w-4" />
            {attachment.name}
          </div>
          <video 
            src={attachment.url} 
            controls 
            className="w-full max-w-sm rounded-lg"
            style={{ maxHeight: '200px' }}
          />
        </div>
      );
    } else if (attachment.type === 'audio') {
      return (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <AudioLines className="h-4 w-4" />
            {attachment.name}
          </div>
          <audio src={attachment.url} controls className="w-full max-w-sm" />
        </div>
      );
    } else if (attachment.type === 'image') {
      return (
        <div className="mt-2">
          <img src={attachment.url} alt={attachment.name} className="w-full max-w-sm rounded-lg" />
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-primary" />
          AI Diagnostic Assistant
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Having issues not covered in the diagnosis? Chat with our AI or share images/video/audio for better analysis.
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "flex gap-3 max-w-[80%] lg:max-w-[70%]",
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div className={cn(
                    "rounded-lg p-3 text-sm leading-relaxed",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}>
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    {message.attachments?.map((attachment, index) => (
                      <div key={index}>
                        {renderAttachment(attachment)}
                      </div>
                    ))}
                    {message.metadata?.confidenceScore && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs opacity-70">
                          Confidence: {Math.round(message.metadata.confidenceScore * 100)}%
                        </p>
                      </div>
                    )}
                    <div className={cn(
                      "text-xs mt-2 opacity-70",
                      message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-3">
          <div className="flex gap-2">
            <VideoUpload
              onVideoSelect={handleVideoSelect}
              onVideoRemove={() => setSelectedVideo(null)}
              selectedVideo={selectedVideo}
              disabled={isLoading}
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={selectedImages.length >= 3 || isLoading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Images ({selectedImages.length}/3)
              </Button>
            </div>
          </div>

          {selectedImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Preview ${idx + 1}`}
                    className="h-20 w-20 object-cover rounded border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your device issues in detail..."
                className="min-h-[60px] resize-none"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleTextSubmit}
                disabled={(!newMessage.trim() && selectedImages.length === 0 && !selectedVideo) || isLoading}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
              <VoiceRecorder 
                onRecordingComplete={handleVoiceRecording}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChatInterface;
