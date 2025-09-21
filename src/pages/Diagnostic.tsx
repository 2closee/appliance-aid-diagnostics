import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Tv, 
  Smartphone, 
  Headphones, 
  Monitor,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  MapPin,
  MessageCircle,
  Users,
  Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AIChatInterface from "@/components/AIChatInterface";
import RepairCenterChatInterface from "@/components/RepairCenterChatInterface";
import { useAuth } from "@/hooks/useAuth";
import RepairCenterSelector from "@/components/RepairCenterSelector";

type ApplianceType = 'tv' | 'smartphone' | 'headphones' | 'monitor';
type DiagnosticStep = {
  question: string;
  options: string[];
  followUp?: Record<string, DiagnosticStep>;
};

const Diagnostic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<{type: 'software' | 'hardware' | '', message: string, recommendations: string[]}>({
    type: '',
    message: '',
    recommendations: []
  });
  const [showAIChat, setShowAIChat] = useState(false);
  const [showRepairCenterChat, setShowRepairCenterChat] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showRepairCenterSelector, setShowRepairCenterSelector] = useState(false);
  const [selectedRepairCenter, setSelectedRepairCenter] = useState<any>(null);

  const appliances = [
    { id: 'tv', name: 'TV', icon: Tv, description: 'Smart TV, LED, OLED' },
    { id: 'smartphone', name: 'Smartphone', icon: Smartphone, description: 'Android, iPhone' },
    { id: 'headphones', name: 'Headphones', icon: Headphones, description: 'Wireless, Wired' },
    { id: 'monitor', name: 'Monitor', icon: Monitor, description: 'PC Monitor, Display' },
  ];

  const diagnosticFlow: Record<ApplianceType, DiagnosticStep[]> = {
    tv: [
      {
        question: "Is your TV turning on?",
        options: ["Yes, it turns on", "No, it won't turn on", "It turns on but shuts off immediately"]
      },
      {
        question: "Do you see any image on the screen?",
        options: ["Yes, clear image", "No image, black screen", "Distorted or flickering image", "Image but no sound"]
      },
      {
        question: "Are there any error messages or blinking lights?",
        options: ["No error messages", "Error message displayed", "Blinking red light", "Blinking blue light"]
      }
    ],
    smartphone: [
      {
        question: "Is your phone turning on?",
        options: ["Yes, it turns on normally", "No, completely dead", "Turns on but freezes", "Turns on but restarts continuously"]
      },
      {
        question: "Is the screen responsive to touch?",
        options: ["Yes, works perfectly", "No, unresponsive", "Partially responsive", "Screen is cracked"]
      },
      {
        question: "Are you experiencing any specific issues?",
        options: ["Battery drains quickly", "Overheating", "No sound", "Camera not working", "Apps crashing"]
      }
    ],
    headphones: [
      {
        question: "Are your headphones connecting to the device?",
        options: ["Yes, connects normally", "No, won't connect", "Connects but disconnects frequently", "One side not working"]
      },
      {
        question: "What type of audio issue are you experiencing?",
        options: ["No sound at all", "Low volume", "Crackling/static noise", "Sound cuts in and out", "Sound only from one side"]
      }
    ],
    monitor: [
      {
        question: "Is your monitor receiving power?",
        options: ["Yes, power light is on", "No power light", "Power light blinks", "Power light is on but no display"]
      },
      {
        question: "What do you see on the screen?",
        options: ["Nothing, black screen", "No signal message", "Distorted image", "Flickering display", "Wrong colors"]
      }
    ]
  };

  const analyzeDiagnosis = (appliance: ApplianceType, answers: string[]) => {
    // Simple rule-based diagnosis logic
    const softwareKeywords = ['error message', 'apps crashing', 'freezes', 'restarts', 'no signal'];
    const hardwareKeywords = ['won\'t turn on', 'black screen', 'cracked', 'no power', 'blinking', 'flickering', 'one side'];

    const answerText = answers.join(' ').toLowerCase();
    const hasSoftwareIssue = softwareKeywords.some(keyword => answerText.includes(keyword));
    const hasHardwareIssue = hardwareKeywords.some(keyword => answerText.includes(keyword));

    if (hasSoftwareIssue && !hasHardwareIssue) {
      return {
        type: 'software' as const,
        message: 'Based on your answers, this appears to be a software-related issue that can potentially be resolved with troubleshooting steps.',
        recommendations: [
          'Try restarting the device',
          'Check for software updates',
          'Reset to factory settings if needed',
          'Clear cache and data for problematic apps'
        ]
      };
    } else if (hasHardwareIssue || (!hasSoftwareIssue && !hasHardwareIssue)) {
      return {
        type: 'hardware' as const,
        message: 'Based on your answers, this appears to be a hardware-related issue that requires professional repair.',
        recommendations: [
          'Professional diagnosis required',
          'May need component replacement',
          'Contact authorized repair center',
          'Check warranty status'
        ]
      };
    }

    return {
      type: 'hardware' as const,
      message: 'Unable to determine the exact issue. Professional diagnosis is recommended.',
      recommendations: ['Contact our repair center for professional diagnosis']
    };
  };

  const handleApplianceSelect = (appliance: ApplianceType) => {
    setSelectedAppliance(appliance);
    setCurrentStep(0);
    setAnswers([]);
    setDiagnosis({ type: '', message: '', recommendations: [] });
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (selectedAppliance && currentStep < diagnosticFlow[selectedAppliance].length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (selectedAppliance) {
      // Complete diagnosis
      const result = analyzeDiagnosis(selectedAppliance, newAnswers);
      setDiagnosis(result);
    }
  };

  const resetDiagnosis = () => {
    setSelectedAppliance(null);
    setCurrentStep(0);
    setAnswers([]);
    setDiagnosis({ type: '', message: '', recommendations: [] });
    setShowAIChat(false);
    setShowRepairCenterChat(false);
    setShowChatOptions(false);
    setShowRepairCenterSelector(false);
    setSelectedRepairCenter(null);
  };

  const handleDiagnosisUpdate = (newDiagnosis: string, recommendations: string[]) => {
    setDiagnosis({
      type: 'hardware', // Assume hardware since AI determined need for update
      message: newDiagnosis,
      recommendations
    });
  };

  const progress = selectedAppliance ? ((currentStep + 1) / diagnosticFlow[selectedAppliance].length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-6 lg:mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 lg:mb-4 flex items-center justify-center flex-wrap gap-2">
              <Bot className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
              AI Diagnostic Agent
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Get instant diagnosis for your appliance issues with our AI-powered diagnostic tool. 
              Upload videos, use voice commands, or chat with our AI for comprehensive analysis.
            </p>
          </header>

          {!selectedAppliance && (
            <Card className="shadow-medium">
              <CardHeader className="text-center lg:text-left">
                <CardTitle className="text-xl lg:text-2xl">Select Your Appliance</CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Choose the appliance you're having trouble with to start the diagnostic process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {appliances.map((appliance) => (
                    <Card 
                      key={appliance.id}
                      className="cursor-pointer hover:shadow-medium transition-all duration-300 border-2 hover:border-primary hover:scale-105 group"
                      onClick={() => handleApplianceSelect(appliance.id as ApplianceType)}
                    >
                      <CardContent className="p-4 lg:p-6 text-center">
                        <appliance.icon className="h-10 w-10 lg:h-12 lg:w-12 text-primary mx-auto mb-3 lg:mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg lg:text-xl font-semibold mb-2 leading-tight">{appliance.name}</h3>
                        <p className="text-muted-foreground text-xs lg:text-sm leading-relaxed">{appliance.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedAppliance && !diagnosis.type && !showAIChat && (
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-xl lg:text-2xl">Diagnostic Questions</CardTitle>
                    <CardDescription className="text-sm lg:text-base">
                      Step {currentStep + 1} of {diagnosticFlow[selectedAppliance].length}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={resetDiagnosis} size="sm" className="self-start lg:self-auto">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
                <Progress value={progress} className="mt-4" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold mb-4 leading-relaxed">
                    {diagnosticFlow[selectedAppliance][currentStep].question}
                  </h3>
                  <div className="grid gap-3">
                    {diagnosticFlow[selectedAppliance][currentStep].options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start h-auto p-4 text-left leading-relaxed hover:bg-primary/5 hover:border-primary transition-colors"
                        onClick={() => handleAnswer(option)}
                      >
                        <span className="text-sm lg:text-base">{option}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {answers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-base lg:text-lg">Your Previous Answers:</h4>
                    <div className="space-y-2">
                      {answers.map((answer, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 rounded-lg bg-muted/50">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm lg:text-base leading-relaxed">{answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {diagnosis.type && !showAIChat && !showRepairCenterChat && !showChatOptions && !showRepairCenterSelector && (
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-xl lg:text-2xl flex items-center flex-wrap gap-2">
                      {diagnosis.type === 'software' ? (
                        <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-success" />
                      ) : (
                        <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-warning" />
                      )}
                      <span>Diagnosis Complete</span>
                    </CardTitle>
                    <CardDescription>
                      <Badge variant={diagnosis.type === 'software' ? 'default' : 'secondary'} className="text-xs lg:text-sm">
                        {diagnosis.type === 'software' ? 'Software Issue' : 'Hardware Issue'}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log("Get Personalized Help clicked, showChatOptions:", showChatOptions);
                        setShowChatOptions(true);
                      }} 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Get Personalized Help
                    </Button>
                    <Button variant="outline" onClick={resetDiagnosis} size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold mb-3">Diagnosis Result:</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm lg:text-base">{diagnosis.message}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg lg:text-xl font-semibold mb-3">Recommendations:</h3>
                  <ul className="space-y-3">
                    {diagnosis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm lg:text-base leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {diagnosis.type === 'hardware' && (
                  <div className="bg-gradient-card p-4 lg:p-6 rounded-lg border">
                    <h3 className="text-lg lg:text-xl font-semibold mb-4 text-center lg:text-left">Next Steps</h3>
                    <p className="text-muted-foreground mb-4 text-sm lg:text-base leading-relaxed text-center lg:text-left">
                      Since this appears to be a hardware issue, we recommend visiting our repair center or scheduling a pickup. 
                      Any videos or audio you share will help technicians better understand the problem.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={() => user ? navigate('/repair-centers') : navigate('/auth')} className="flex-1">
                        <MapPin className="h-4 w-4 mr-2" />
                        Find Repair Center
                      </Button>
                      <Button onClick={() => user ? navigate('/pickup-request') : navigate('/auth')} variant="outline" className="flex-1">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Schedule Pickup
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 lg:p-6 rounded-lg border border-primary/20">
                  <h3 className="text-lg lg:text-xl font-semibold mb-3 text-center lg:text-left">
                    Need More Help?
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm lg:text-base leading-relaxed text-center lg:text-left">
                    If this diagnosis doesn't cover your specific issues, get personalized assistance. 
                    You can upload videos, use voice commands, or describe your problems in detail.
                  </p>
                  <div className="flex justify-center lg:justify-start">
                    <Button 
                      onClick={() => {
                        console.log("Get Personalized Help clicked, current showChatOptions:", showChatOptions);
                        console.log("selectedAppliance:", selectedAppliance);
                        setShowChatOptions(true);
                        console.log("After setting showChatOptions to true");
                      }}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Get Personalized Help
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showChatOptions && selectedAppliance && (
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl lg:text-2xl">Choose Your Help Option</CardTitle>
                    <CardDescription className="text-sm lg:text-base">
                      Select how you'd like to get personalized assistance
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowChatOptions(false)} size="sm">
                    Back to Diagnosis
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className="cursor-pointer hover:shadow-medium transition-all duration-300 border-2 hover:border-primary hover:scale-105 group"
                    onClick={() => {
                      console.log("AI Chat option clicked");
                      setShowChatOptions(false);
                      setShowAIChat(true);
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <Bot className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg font-semibold mb-2">Chat with AI Assistant</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Get instant AI-powered assistance with voice, video, and text support
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer hover:shadow-medium transition-all duration-300 border-2 hover:border-primary hover:scale-105 group"
                    onClick={() => {
                      console.log("Repair Center Chat option clicked");
                      setShowChatOptions(false);
                      setShowRepairCenterSelector(true);
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <Users className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg font-semibold mb-2">Chat with Repair Center</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Connect with local repair experts for professional assistance
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {showAIChat && selectedAppliance && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold">AI Assistant Chat</h2>
                  <p className="text-muted-foreground text-sm lg:text-base">
                    Get personalized help with voice, text, or video
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowAIChat(false)} size="sm">
                  Back to Options
                </Button>
              </div>
              
              <AIChatInterface
                appliance={appliances.find(a => a.id === selectedAppliance)?.name || selectedAppliance}
                initialDiagnosis={diagnosis.message || 'Initial diagnostic questions completed'}
                onDiagnosisUpdate={handleDiagnosisUpdate}
              />
            </div>
          )}

          {showRepairCenterChat && selectedAppliance && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold">Repair Center Chat</h2>
                  <p className="text-muted-foreground text-sm lg:text-base">
                    Connect with local repair experts
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowRepairCenterChat(false)} size="sm">
                  Back to Options
                </Button>
              </div>
              
              <RepairCenterChatInterface
                appliance={appliances.find(a => a.id === selectedAppliance)?.name || selectedAppliance}
                diagnosis={diagnosis.message}
                onSchedulePickup={() => user ? navigate('/pickup-request') : navigate('/auth')}
                onFindRepairCenter={() => user ? navigate('/repair-centers') : navigate('/auth')}
                selectedCenter={selectedRepairCenter}
              />
            </div>
          )}

          {showRepairCenterSelector && selectedAppliance && (
            <RepairCenterSelector
              onSelectCenter={(center) => {
                setSelectedRepairCenter(center);
                setShowRepairCenterSelector(false);
                setShowRepairCenterChat(true);
              }}
              onBack={() => {
                setShowRepairCenterSelector(false);
                setShowChatOptions(true);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Diagnostic;