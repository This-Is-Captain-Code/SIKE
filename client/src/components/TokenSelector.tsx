import { useState } from "react";
import { SUPPORTED_TOKENS, TokenConfig, DEFAULT_TOKEN } from "@shared/tokenConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TokenSelectorProps {
  selectedToken?: TokenConfig;
  onTokenChange: (token: TokenConfig) => void;
  disabled?: boolean;
  className?: string;
}

export function TokenSelector({ 
  selectedToken = DEFAULT_TOKEN, 
  onTokenChange,
  disabled = false,
  className = ""
}: TokenSelectorProps) {
  const handleValueChange = (tokenId: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.id === tokenId);
    if (token) {
      onTokenChange(token);
    }
  };

  return (
    <Select 
      value={selectedToken.id} 
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger 
        className={`w-full ${className}`}
        data-testid="selector-token"
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedToken.color }}
            />
            <span className="font-medium">{selectedToken.symbol}</span>
            <Badge variant="secondary" className="text-xs">
              ${selectedToken.minAmount} - ${selectedToken.maxAmount}
            </Badge>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_TOKENS.map((token) => (
          <SelectItem 
            key={token.id} 
            value={token.id}
            data-testid={`token-option-${token.id}`}
          >
            <div className="flex items-center gap-3 w-full">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: token.color }}
              />
              <div className="flex flex-col">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-sm text-muted-foreground">{token.name}</span>
              </div>
              <div className="ml-auto">
                <Badge variant="outline" className="text-xs">
                  ${token.minAmount} - ${token.maxAmount}
                </Badge>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TokenSelector;