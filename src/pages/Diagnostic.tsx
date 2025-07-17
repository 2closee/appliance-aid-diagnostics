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
  MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

type ApplianceType = 'tv' | 'smartphone' | 'headphones' | 'monitor';
type DiagnosticStep = {
  question: string;
  options: string[];
  followUp?: Record<string, DiagnosticStep>;
};

const Diagnostic = () => {
  const navigate = useNavigate();
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<{type: 'software' | 'hardware' | '', message: string, recommendations: string[]}>({
    type: '',
    message: '',
    recommendations: []
  });

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
  };

  const progress = selectedAppliance ? ((currentStep + 1) / diagnosticFlow[selectedAppliance].length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center">
              <Bot className="h-10 w-10 text-primary mr-4" />
              AI Diagnostic Agent
            </h1>
            <p className="text-lg text-muted-foreground">
              Get instant diagnosis for your appliance issues with our AI-powered diagnostic tool
            </p>
          </div>

          {!selectedAppliance && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-2xl">Select Your Appliance</CardTitle>
                <CardDescription>
                  Choose the appliance you're having trouble with to start the diagnostic process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {appliances.map((appliance) => (
                    <Card 
                      key={appliance.id}
                      className="cursor-pointer hover:shadow-medium transition-shadow border-2 hover:border-primary"
                      onClick={() => handleApplianceSelect(appliance.id as ApplianceType)}
                    >
                      <CardContent className="p-6 text-center">
                        <appliance.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">{appliance.name}</h3>
                        <p className="text-muted-foreground text-sm">{appliance.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedAppliance && !diagnosis.type && (
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Diagnostic Questions</CardTitle>
                  <Button variant="outline" onClick={resetDiagnosis}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
                <CardDescription>
                  Step {currentStep + 1} of {diagnosticFlow[selectedAppliance].length}
                </CardDescription>
                <Progress value={progress} className="mt-4" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {diagnosticFlow[selectedAppliance][currentStep].question}
                  </h3>
                  <div className="space-y-3">
                    {diagnosticFlow[selectedAppliance][currentStep].options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start h-auto p-4 text-left"
                        onClick={() => handleAnswer(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>

                {answers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Your Previous Answers:</h4>
                    <div className="space-y-2">
                      {answers.map((answer, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm">{answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {diagnosis.type && (
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center">
                    {diagnosis.type === 'software' ? (
                      <CheckCircle className="h-8 w-8 text-success mr-3" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-warning mr-3" />
                    )}
                    Diagnosis Complete
                  </CardTitle>
                  <Button variant="outline" onClick={resetDiagnosis}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
                <CardDescription>
                  <Badge variant={diagnosis.type === 'software' ? 'default' : 'secondary'}>
                    {diagnosis.type === 'software' ? 'Software Issue' : 'Hardware Issue'}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Diagnosis Result:</h3>
                  <p className="text-muted-foreground">{diagnosis.message}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">Recommendations:</h3>
                  <ul className="space-y-2">
                    {diagnosis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {diagnosis.type === 'hardware' && (
                  <div className="bg-gradient-card p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                    <p className="text-muted-foreground mb-4">
                      Since this appears to be a hardware issue, we recommend visiting our repair center or scheduling a pickup.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={() => navigate('/repair-centers')} className="flex-1">
                        <MapPin className="h-4 w-4 mr-2" />
                        Find Repair Center
                      </Button>
                      <Button onClick={() => navigate('/pickup-request')} variant="outline" className="flex-1">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Schedule Pickup
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Diagnostic;