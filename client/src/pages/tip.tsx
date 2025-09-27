import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { TokenSelector } from "@/components/TokenSelector";
import { TipAmountSlider } from "@/components/TipAmountSlider";
import { TokenConfig, DEFAULT_TOKEN } from "@shared/tokenConfig";

interface PublicUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function TipPage() {
  const [, params] = useRoute("/tip/:username");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [tipSent, setTipSent] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(DEFAULT_TOKEN);
  const [tipAmount, setTipAmount] = useState(DEFAULT_TOKEN.minAmount);

  const username = params?.username;

  // Fetch recipient user data
  const { data: recipient, isLoading: isLoadingRecipient, error: recipientError } = useQuery<PublicUser>({
    queryKey: ["/api/users", username],
    enabled: !!username,
    retry: false, // Don't retry on 404 errors
    refetchOnWindowFocus: false,
  });

  // Send tip mutation (always uses hardcoded 0.01 PYUSD regardless of slider)
  const sendTipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tips/send", {
        recipientUsername: username,
        amount: "0.01", // Hardcoded PYUSD amount
        message: "Tip via SIKE"
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTipSent(true);
      setTxHash(data.transactionHash);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Tip Sent! 🎉",
        description: `$0.01 PYUSD sent to ${recipient?.firstName || recipient?.username}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Failed to Send Tip",
        description: "Please try again or check your wallet balance",
        variant: "destructive",
      });
      console.error("Tip sending failed:", error);
    },
  });

  // Handle sending the tip
  const handleSendTip = () => {
    sendTipMutation.mutate();
  };

  // Handle token change and reset amount to min for new token
  const handleTokenChange = (token: TokenConfig) => {
    setSelectedToken(token);
    setTipAmount(token.minAmount);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Loading state
  if (isLoading || isLoadingRecipient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Preparing your tip</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not found (either no data or error occurred)
  if (!recipient || recipientError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-user-slash text-2xl text-destructive"></i>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The user @{username} does not exist or hasn't set up their wallet yet.
            </p>
            <p className="text-xs text-muted-foreground">Window will close automatically</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (tipSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-chart-2/5 to-chart-3/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-chart-2/10 mx-auto flex items-center justify-center">
              <i className="fas fa-check text-3xl text-chart-2"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="title-tip-success">
                Tip Sent! 🎉
              </h2>
              <p className="text-muted-foreground">
                $0.01 PYUSD sent to{" "}
                <span className="font-medium" data-testid="text-recipient-name">
                  {recipient.firstName || recipient.username}
                </span>
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">$0.01 PYUSD</span>
              </div>
              {txHash && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-foreground" data-testid="text-transaction-hash">
                      {txHash.slice(0, 8)}...{txHash.slice(-6)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(txHash, 'Transaction hash')}
                      className="ml-1 p-1 hover:bg-muted rounded transition-colors"
                      data-testid="button-copy-transaction-hash"
                      title="Copy transaction hash"
                    >
                      <i className="fas fa-copy text-xs text-muted-foreground hover:text-foreground"></i>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-chart-2 font-medium">Confirmed</span>
              </div>
            </div>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
              data-testid="button-close-window"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main tip configuration state
  const displayName = recipient.firstName && recipient.lastName 
    ? `${recipient.firstName} ${recipient.lastName}`
    : recipient.firstName || recipient.username;

  const initials = recipient.firstName && recipient.lastName
    ? `${recipient.firstName[0]}${recipient.lastName[0]}`
    : (recipient.firstName?.[0] || recipient.username?.[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 space-y-6">
          {/* Recipient Info */}
          <div className="text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-accent mx-auto flex items-center justify-center">
              <span className="text-2xl font-bold text-white" data-testid="text-recipient-initials">
                {initials}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-recipient-display-name">
                {displayName}
              </h2>
              <p className="text-muted-foreground" data-testid="text-recipient-username">
                @{recipient.username}
              </p>
            </div>
          </div>

          {/* Visual Demo: Token & Amount Controls - For Show Only */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-semibold mb-2">
                🎛️ DEMO: Token & Amount Selector (Visual Only)
              </p>
            </div>
            
            {/* Token Selector - Visual Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Select Token (Demo)
              </label>
              <TokenSelector
                selectedToken={selectedToken}
                onTokenChange={setSelectedToken}
                className="opacity-75"
              />
            </div>
            
            {/* Amount Slider - Visual Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Tip Amount (Demo)
              </label>
              <TipAmountSlider
                token={selectedToken}
                value={tipAmount}
                onChange={setTipAmount}
              />
            </div>
          </div>
          
          {/* Actual Tip Amount */}
          <div className="text-center bg-primary/5 rounded-lg p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Actual tip amount:</p>
            <div className="text-3xl font-bold text-primary">$0.01 PYUSD</div>
            <p className="text-xs text-muted-foreground mt-1">Fixed amount for all tips</p>
          </div>

          {/* Send Button */}
          <div className="space-y-4">
            <Button 
              onClick={() => sendTipMutation.mutate()}
              disabled={sendTipMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-send-tip"
            >
              {sendTipMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending Tip...
                </div>
              ) : (
                "Send $0.01 PYUSD Tip"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              This will send a micro-tip to {recipient.firstName || recipient.username}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
