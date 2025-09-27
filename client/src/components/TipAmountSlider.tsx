import { useState, useEffect } from "react";
import { TokenConfig, formatTokenAmount, isAmountValid, clampAmount } from "@shared/tokenConfig";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TipAmountSliderProps {
  token: TokenConfig;
  value: string;
  onChange: (amount: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TipAmountSlider({ 
  token, 
  value, 
  onChange,
  disabled = false,
  className = ""
}: TipAmountSliderProps) {
  const [inputValue, setInputValue] = useState(value);
  const [sliderValue, setSliderValue] = useState([parseFloat(value)]);

  const minValue = parseFloat(token.minAmount);
  const maxValue = parseFloat(token.maxAmount);
  const stepValue = parseFloat(token.step);

  // Update internal state when external value changes or token changes
  useEffect(() => {
    const clampedValue = clampAmount(value, token);
    setInputValue(clampedValue);
    setSliderValue([parseFloat(clampedValue)]);
  }, [value, token]);

  const handleSliderChange = (newValue: number[]) => {
    const amount = newValue[0];
    const formattedAmount = amount.toFixed(token.displayPrecision);
    setSliderValue(newValue);
    setInputValue(formattedAmount);
    onChange(formattedAmount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate and update if valid
    if (isAmountValid(newValue, token)) {
      setSliderValue([parseFloat(newValue)]);
      onChange(formatTokenAmount(newValue, token));
    }
  };

  const handleInputBlur = () => {
    // Clamp the input value when focus is lost
    const clampedValue = clampAmount(inputValue, token);
    setInputValue(clampedValue);
    setSliderValue([parseFloat(clampedValue)]);
    onChange(clampedValue);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="tip-amount-input">
          Tip Amount ({token.symbol})
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">$</span>
          <Input
            id="tip-amount-input"
            type="number"
            min={minValue}
            max={maxValue}
            step={stepValue}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            className="flex-1"
            data-testid="input-tip-amount"
          />
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: token.color }}
          />
          <span className="text-sm font-medium min-w-[60px]">
            {token.symbol}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${token.minAmount}</span>
          <span>${token.maxAmount}</span>
        </div>
        <Slider
          min={minValue}
          max={maxValue}
          step={stepValue}
          value={sliderValue}
          onValueChange={handleSliderChange}
          disabled={disabled}
          className="w-full"
          data-testid="slider-tip-amount"
        />
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color: token.color }}>
          ${formatTokenAmount(inputValue, token)} {token.symbol}
        </div>
        <div className="text-sm text-muted-foreground">
          Micro-tip amount
        </div>
      </div>
    </div>
  );
}

export default TipAmountSlider;