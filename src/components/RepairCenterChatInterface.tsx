import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Truck, 
  MapPin, 
  Loader2, 
  Users, 
  Clock,
  Phone
} from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import VideoUpload from "./VideoUpload";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'repair-center';
  timestamp: Date;
  attachments?: {
    type: 'video' | 'audio';
    url: string;
    name: string;
  }[];
}

interface RepairCenter {
  id: number;
  name: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  specialties: string[];
  distance: number;
}

interface RepairCenterChatInterfaceProps {
  appliance: string;
  diagnosis: string;
  onSchedulePickup: () => void;
  onFindRepairCenter: () => void;
  selectedCenter?: RepairCenter;
}

const RepairCenterChatInterface = ({ 
  appliance, 
  diagnosis, 
  onSchedulePickup, 
  onFindRepairCenter,
  selectedCenter 
}: RepairCenterChatInterfaceProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm a technician from ${selectedCenter?.name || 'our repair center'}. I see you're having issues with your ${appliance}. Based on the initial diagnosis: "${diagnosis}". I'm here to help! Can you describe the problem in more detail or share a video/audio of the issue?`,
      sender: 'repair-center',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content?: string, attachments?: any[]) => {
    const messageContent = content || userInput.trim();
    if (!messageContent && !attachments?.length) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date(),
      attachments
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput("");
    setSelectedVideo(null);
    setIsLoading(true);

    // Simulate repair center response
    setTimeout(() => {
      const responses = [
        "Thanks for the details! Based on what you've described, this looks like it might need professional attention. Would you like to schedule a pickup or visit our repair center?",
        "I can see the issue you're experiencing. Let me check our repair schedule. We can either pick up your device or you can bring it to our center. Which would you prefer?",
        "That's helpful information. From what you've shared, this appears to be a hardware issue that we can definitely fix. Would you like to schedule a repair service?",
        "Thank you for the video/audio. This gives me a clear picture of the problem. We have technicians available who can help. Would you like to set up a pickup or visit us directly?"
      ];

      const repairCenterMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'repair-center',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, repairCenterMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleVoiceRecording = (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    handleSendMessage("Sent a voice message", [{
      type: 'audio' as const,
      url: audioUrl,
      name: 'voice-message.wav'
    }]);
    
    toast({
      title: "Voice message sent",
      description: "Your voice message has been sent to the repair center.",
    });
  };

  const handleVideoSelect = (file: File) => {
    setSelectedVideo(file);
  };

  const handleVideoUpload = () => {
    if (selectedVideo) {
      const videoUrl = URL.createObjectURL(selectedVideo);
      handleSendMessage("Sent a video", [{
        type: 'video' as const,
        url: videoUrl,
        name: selectedVideo.name
      }]);
      
      toast({
        title: "Video uploaded",
        description: "Your video has been sent to the repair center.",
      });
    }
  };

  const renderAttachment = (attachment: Message['attachments'][0]) => {
    if (attachment.type === 'video') {
      return (
        <div className="mt-2">
          <video 
            src={attachment.url} 
            controls 
            className="max-w-xs rounded-lg shadow-sm"
          />
        </div>
      );
    } else if (attachment.type === 'audio') {
      return (
        <div className="mt-2">
          <audio 
            src={attachment.url} 
            controls 
            className="max-w-xs"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Repair Center Info */}
      {selectedCenter && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{selectedCenter.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedCenter.address}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {selectedCenter.phone}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{selectedCenter.distance} mi away</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg">Live Chat with Repair Experts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <ScrollArea className="h-96 w-full rounded-md border p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-3 max-w-[80%] ${
                    message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {message.sender === 'user' ? 'You' : 'RC'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-3 ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.attachments?.map((attachment, index) => (
                        <div key={index}>
                          {renderAttachment(attachment)}
                        </div>
                      ))}
                      <p className={`text-xs mt-2 ${
                        message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary">RC</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Repair center is typing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onSchedulePickup} className="flex-1">
              <Truck className="h-4 w-4 mr-2" />
              Schedule Pickup
            </Button>
            <Button onClick={onFindRepairCenter} variant="outline" className="flex-1">
              <MapPin className="h-4 w-4 mr-2" />
              Visit Repair Center
            </Button>
          </div>

          <Separator />

          {/* Input Area */}
          <div className="space-y-4">
            {/* Video Upload */}
            <VideoUpload onVideoSelect={handleVideoSelect} onVideoRemove={() => setSelectedVideo(null)} />
            {selectedVideo && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Video selected: {selectedVideo.name}
                </span>
                <Button size="sm" onClick={handleVideoUpload}>
                  Send Video
                </Button>
              </div>
            )}

            {/* Text Input Form */}
            <form onSubmit={handleTextSubmit} className="flex space-x-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe your issue or ask questions..."
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit(e);
                  }
                }}
              />
              <div className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!userInput.trim()}
                  className="h-[60px] w-12"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <VoiceRecorder 
                  onRecordingComplete={handleVoiceRecording}
                  disabled={isLoading}
                />
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairCenterChatInterface;