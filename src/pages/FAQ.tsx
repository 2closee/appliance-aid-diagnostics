import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, HelpCircle, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

const FAQ = () => {
  const navigate = useNavigate();

  const faqCategories = [
    {
      title: "Getting Started",
      questions: [
        {
          question: "What is Fixbudi?",
          answer: "Fixbudi is an AI-powered appliance repair platform that helps you diagnose issues with your home appliances and connects you with verified repair centers. We offer instant diagnostic assistance, professional repair services, and convenient pickup/delivery options."
        },
        {
          question: "How does the AI diagnostic system work?",
          answer: "Our AI diagnostic system asks you targeted questions about your appliance and its symptoms. Based on your responses, it analyzes the issue and provides potential solutions. If the problem can't be resolved remotely, it will recommend connecting you with a professional repair center."
        },
        {
          question: "Do I need to create an account?",
          answer: "You can start using the AI diagnostic tool without an account. However, to request repairs, track jobs, or communicate with repair centers, you'll need to create a free account. This helps us provide you with personalized service and maintain your repair history."
        },
        {
          question: "Is the service available in my area?",
          answer: "Fixbudi is currently based in Port Harcourt, Rivers State, Nigeria. We're continuously expanding our network of repair centers. Check our repair centers page to see available locations near you."
        }
      ]
    },
    {
      title: "Repair Services",
      questions: [
        {
          question: "What types of appliances do you repair?",
          answer: "We specialize in repairing a wide range of household appliances including air conditioners, televisions, refrigerators, washing machines, microwaves, and other consumer electronics. Our network of certified technicians has expertise across multiple appliance brands and types."
        },
        {
          question: "How do I choose a repair center?",
          answer: "After completing your diagnostic, you'll be presented with a list of verified repair centers in your area. You can view their ratings, specialties, years of experience, and customer reviews to make an informed decision. All centers in our network are thoroughly vetted."
        },
        {
          question: "How long does a repair typically take?",
          answer: "Repair time varies depending on the issue complexity and parts availability. Simple repairs may be completed within 1-2 days, while complex issues requiring special parts might take longer. Your assigned repair center will provide an estimated completion time after initial assessment."
        },
        {
          question: "What if the repair center needs to order parts?",
          answer: "If your appliance requires replacement parts, the repair center will inform you about the parts needed, associated costs, and estimated delivery time. You'll receive updates throughout the process, and repairs will resume once parts arrive."
        }
      ]
    },
    {
      title: "Pickup & Delivery",
      questions: [
        {
          question: "How does the pickup service work?",
          answer: "Once you select a repair center and confirm your service request, you can schedule a convenient pickup time. Our logistics partners will collect your appliance from your specified address and deliver it to the repair center. You'll receive tracking updates throughout the process."
        },
        {
          question: "Is pickup and delivery included in the repair cost?",
          answer: "Pickup and delivery costs are separate from repair charges. The exact cost depends on your location, appliance size, and distance to the repair center. You'll see transparent pricing before confirming your pickup request."
        },
        {
          question: "Can I drop off my appliance directly at the repair center?",
          answer: "Yes! If you prefer, you can take your appliance directly to the repair center. Contact details and addresses are provided once you select a repair center. This can help you save on pickup/delivery costs."
        },
        {
          question: "How will I know when my appliance is ready?",
          answer: "You'll receive email and in-app notifications at every stage: when repairs begin, when they're completed, and when your appliance is ready for delivery or pickup. You can also track the status in your dashboard."
        }
      ]
    },
    {
      title: "Pricing & Payment",
      questions: [
        {
          question: "How much do repairs cost?",
          answer: "Repair costs vary based on the issue, required parts, and labor. After initial diagnosis, the repair center will provide you with a detailed quote including parts and labor costs. You'll approve this quote before any work begins. The AI diagnostic gives you an estimated cost range upfront."
        },
        {
          question: "When do I pay for the repair?",
          answer: "Payment is due once repairs are completed and you've confirmed satisfaction with the work. You'll have 7 days after repair completion to make payment. We accept various payment methods for your convenience."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept major payment methods including bank transfers, card payments, and mobile money. Specific payment options will be displayed when you're ready to pay for your repair service."
        },
        {
          question: "Is there a diagnostic fee?",
          answer: "Our AI-powered diagnostic tool is completely free to use. If you proceed with a repair center, some centers may charge an inspection or diagnostic fee which will be clearly communicated in their quote."
        },
        {
          question: "What if the quoted price changes?",
          answer: "If a repair center discovers additional issues during repairs, they must request a cost adjustment and explain the reasons. You'll have the opportunity to approve or reject the adjusted quote before they proceed with additional work."
        }
      ]
    },
    {
      title: "Account & Security",
      questions: [
        {
          question: "How do I reset my password?",
          answer: "Click on the 'Forgot Password' link on the login page. Enter your registered email address, and we'll send you instructions to reset your password. Follow the link in the email to create a new password."
        },
        {
          question: "Is my personal information secure?",
          answer: "Yes, we take data security seriously. All personal information is encrypted and stored securely. We only share your contact details with the repair center handling your job, and we never sell your information to third parties."
        },
        {
          question: "Can I delete my account?",
          answer: "Yes, you can request account deletion by contacting our support team. Please note that deleting your account will remove all your repair history and saved information."
        },
        {
          question: "Why do repair centers need my phone number?",
          answer: "Your phone number is shared with assigned repair centers to enable direct communication about your repair. This ensures they can contact you for updates, clarifications, or scheduling without delays."
        }
      ]
    },
    {
      title: "For Repair Centers",
      questions: [
        {
          question: "How can I join as a repair center?",
          answer: "Click on 'Join as Repair Center' on our homepage to access the application form. You'll need to provide business details, certifications, and relevant documentation. Our team reviews all applications and responds within 3-5 business days."
        },
        {
          question: "What are the requirements to become a partner repair center?",
          answer: "We require valid business registration (CAC), tax identification, relevant certifications, proof of expertise, and a physical location. You should have experienced technicians and the ability to handle various appliance types."
        },
        {
          question: "How do I receive payments for completed repairs?",
          answer: "Payments are processed according to our settlement schedule. Once a customer confirms satisfaction and makes payment, your earnings (minus platform commission) are transferred to your registered bank account during the next payout cycle."
        },
        {
          question: "What commission does Fixbudi charge?",
          answer: "Fixbudi charges a 7.5% commission on completed repairs. This covers platform maintenance, customer acquisition, payment processing, and support services. The commission is clearly shown in your earnings dashboard."
        }
      ]
    },
    {
      title: "Troubleshooting",
      questions: [
        {
          question: "I didn't receive a verification email. What should I do?",
          answer: "First, check your spam or junk folder. If you still don't see it, you can request a new verification email from your account settings. Make sure you entered the correct email address during registration."
        },
        {
          question: "The repair center isn't responding to my messages. What can I do?",
          answer: "Repair centers typically respond within 24 hours. If you haven't received a response, try contacting them via phone using the contact details in your job dashboard. You can also reach out to our support team for assistance."
        },
        {
          question: "I'm not satisfied with the repair. What are my options?",
          answer: "Contact the repair center immediately to discuss your concerns. If the issue isn't resolved, you can dispute the charge through our platform. Our support team will mediate and help find a fair resolution."
        },
        {
          question: "Can I cancel a repair request?",
          answer: "Yes, you can cancel before the appliance is picked up or work begins. Once repairs have started, cancellation may incur charges for work already completed. Contact the repair center or our support team to discuss cancellation options."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
                <CardDescription className="mt-1">
                  Find answers to common questions about Fixbudi services
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {category.title}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, questionIndex) => (
                    <AccordionItem 
                      key={questionIndex} 
                      value={`${categoryIndex}-${questionIndex}`}
                    >
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

            <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Still have questions?</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't find the answer you're looking for? Our support team is here to help.
                  </p>
                  <Button onClick={() => navigate("/contact-support")}>
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
