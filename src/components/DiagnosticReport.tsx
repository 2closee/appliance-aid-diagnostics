import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileDown, AlertTriangle, Wrench, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface Part {
  name: string;
  partNumber?: string;
  estimatedCost?: number;
}

interface DiagnosticReportProps {
  appliance: string;
  applianceBrand?: string;
  applianceModel?: string;
  diagnosis: string;
  confidenceScore: number;
  recommendations: string[];
  estimatedCost?: { min?: number; max?: number };
  recommendedParts?: Part[];
  repairUrgency?: string;
  isProfessionalRepairNeeded?: boolean;
  onExportPDF?: () => void;
}

export const DiagnosticReport = ({
  appliance,
  applianceBrand,
  applianceModel,
  diagnosis,
  confidenceScore,
  recommendations,
  estimatedCost,
  recommendedParts,
  repairUrgency,
  isProfessionalRepairNeeded,
  onExportPDF
}: DiagnosticReportProps) => {
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Diagnostic Report
            </CardTitle>
            <CardDescription>
              {applianceBrand && applianceModel
                ? `${applianceBrand} ${applianceModel} ${appliance}`
                : appliance}
            </CardDescription>
          </div>
          {onExportPDF && (
            <Button onClick={onExportPDF} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence and Urgency */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant={getConfidenceColor(confidenceScore)}>
            Confidence: {Math.round(confidenceScore * 100)}%
          </Badge>
          {repairUrgency && (
            <Badge variant={getUrgencyColor(repairUrgency)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {repairUrgency.toUpperCase()} Priority
            </Badge>
          )}
          {isProfessionalRepairNeeded && (
            <Badge variant="secondary">Professional Repair Required</Badge>
          )}
        </div>

        {/* Diagnosis */}
        <div>
          <h4 className="font-semibold mb-2">Diagnosis</h4>
          <p className="text-sm text-muted-foreground">{diagnosis}</p>
        </div>

        {/* Estimated Cost */}
        {estimatedCost && (estimatedCost.min || estimatedCost.max) && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estimated Repair Cost
            </h4>
            <div className="bg-accent/50 p-3 rounded-lg">
              <p className="text-lg font-semibold">
                {estimatedCost.min && estimatedCost.max
                  ? `${formatCurrency(estimatedCost.min)} - ${formatCurrency(estimatedCost.max)}`
                  : estimatedCost.min
                  ? `From ${formatCurrency(estimatedCost.min)}`
                  : `Up to ${formatCurrency(estimatedCost.max)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Estimate includes parts and labor
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Recommendations</h4>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Parts */}
        {recommendedParts && recommendedParts.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Recommended Parts</h4>
            <div className="space-y-2">
              {recommendedParts.map((part, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-accent/30 rounded">
                  <div>
                    <p className="font-medium text-sm">{part.name}</p>
                    {part.partNumber && (
                      <p className="text-xs text-muted-foreground">Part #: {part.partNumber}</p>
                    )}
                  </div>
                  {part.estimatedCost && (
                    <Badge variant="outline">{formatCurrency(part.estimatedCost)}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
