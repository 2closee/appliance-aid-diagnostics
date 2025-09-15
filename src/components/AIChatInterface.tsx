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
  AlertCircle,
  CheckCircle,
  Video,
  AudioLines
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceRecorder from './VoiceRecorder';
import VideoUpload from './VideoUpload';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'video' | 'audio';
    url: string;
    name: string;
  }[];
}

interface AIChatInterfaceProps {
  appliance: string;
  initialDiagnosis: string;
  onDiagnosisUpdate?: (newDiagnosis: string, recommendations: string[]) => void;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ 
  appliance, 
  initialDiagnosis, 
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
    const fileName = `diagnostic-videos/${Date.now()}-${videoFile.name}`;
    
    const { data, error } = await supabase.storage
      .from('diagnostic-attachments')
      .upload(fileName, videoFile);

    if (error) {
      console.error('Error uploading video:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('diagnostic-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const uploadAudio = async (audioBlob: Blob): Promise<string> => {
    const fileName = `diagnostic-audio/${Date.now()}-recording.webm`;
    
    const { data, error } = await supabase.storage
      .from('diagnostic-attachments')
      .upload(fileName, audioBlob);

    if (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('diagnostic-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      // Convert blob to base64
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
      // Send message to AI for processing
      const { data, error } = await supabase.functions.invoke('ai-diagnostic-chat', {
        body: {
          appliance,
          initialDiagnosis,
          messages: [...messages, userMessage].map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          attachments: attachments?.map(a => ({
            type: a.type,
            url: a.url,
            name: a.name
          }))
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Update diagnosis if AI provided new insights
      if (data.updatedDiagnosis && onDiagnosisUpdate) {
        onDiagnosisUpdate(data.updatedDiagnosis, data.recommendations || []);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = () => {
    if (newMessage.trim() || selectedVideo) {
      const attachments: Message['attachments'] = [];
      
      if (selectedVideo) {
        // We'll upload the video when sending
        handleSendMessage(newMessage, attachments);
      } else {
        handleSendMessage(newMessage);
      }
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      // Transcribe audio
      const transcription = await transcribeAudio(audioBlob);
      
      // Upload audio file
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

  const handleVideoSelect = async (video: File) => {
    try {
      setIsLoading(true);
      const videoUrl = await uploadVideo(video);
      
      const attachments: Message['attachments'] = [{
        type: 'video',
        url: videoUrl,
        name: video.name
      }];

      await handleSendMessage(newMessage || 'I\'ve uploaded a video showing the issue', attachments);
      setSelectedVideo(null);
      setNewMessage('');
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsLoading(false);
    }
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
          Having issues not covered in the diagnosis? Chat with our AI or share video/audio for better analysis.
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
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-3">
          <VideoUpload
            onVideoSelect={handleVideoSelect}
            onVideoRemove={() => setSelectedVideo(null)}
            selectedVideo={selectedVideo}
            disabled={isLoading}
          />

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
                disabled={(!newMessage.trim() && !selectedVideo) || isLoading}
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