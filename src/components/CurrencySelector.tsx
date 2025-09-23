import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { CURRENCY_SYMBOLS } from "@/lib/currency";

interface CurrencySelectorProps {
  value: keyof typeof CURRENCY_SYMBOLS;
  onValueChange: (value: keyof typeof CURRENCY_SYMBOLS) => void;
}

const CurrencySelector = ({ value, onValueChange }: CurrencySelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
          <SelectItem key={code} value={code}>
            {symbol} {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;