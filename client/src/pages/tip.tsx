import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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
  const [message, setMessage] = useState("");
  const [tipSent, setTipSent] = useState(false);
  const [txHash, setTxHash] = useState("");

  const username = params?.username;

  // Fetch recipient user data
  const { data: recipient, isLoading: isLoadingRecipient } = useQuery<PublicUser>({
    queryKey: ["/api/users", username],
    enabled: !!username,
  });

  // Send tip mutation
  const sendTipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tips/send", {
        recipientUsername: username,
        amount: "0.01",
        message: message.trim() || undefined
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
        description: `Your $0.01 PYUSD tip has been sent to ${recipient?.firstName || recipient?.username}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "Please log in to send tips",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Failed to Send Tip",
        description: "Please try again or check your wallet balance",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to send tips",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || isLoadingRecipient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
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
            <Button onClick={() => window.location.href = "/"} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tipSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-chart-2/5 to-chart-3/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            {/* Success Icon */}
            <div className="h-20 w-20 rounded-full bg-chart-2/10 mx-auto flex items-center justify-center">
              <i className="fas fa-check text-3xl text-chart-2"></i>
            </div>

            {/* Success Message */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="title-tip-success">
                Tip Sent! 🎉
              </h2>
              <p className="text-muted-foreground">
                Your $0.01 PYUSD tip has been sent to{" "}
                <span className="font-medium" data-testid="text-recipient-name">
                  {recipient.firstName || recipient.username}
                </span>
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">$0.01 PYUSD</span>
              </div>
              {txHash && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs text-foreground" data-testid="text-transaction-hash">
                    {txHash.slice(0, 8)}...{txHash.slice(-6)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-chart-2 font-medium">Confirmed</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                className="w-full"
                onClick={() => window.location.href = "/"}
                data-testid="button-go-dashboard"
              >
                Back to Dashboard
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => setTipSent(false)}
                data-testid="button-send-another"
              >
                Send Another Tip
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = recipient.firstName && recipient.lastName 
    ? `${recipient.firstName} ${recipient.lastName}`
    : recipient.firstName || recipient.username;

  const initials = recipient.firstName && recipient.lastName
    ? `${recipient.firstName[0]}${recipient.lastName[0]}`
    : (recipient.firstName?.[0] || recipient.username?.[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Recipient Profile */}
          <div>
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-accent mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white" data-testid="text-recipient-initials">
                {initials}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground" data-testid="text-recipient-display-name">
              {displayName}
            </h2>
            <p className="text-muted-foreground" data-testid="text-recipient-username">
              @{recipient.username}
            </p>
          </div>

          {/* Tip Amount */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">You're about to send</p>
            <div className="text-3xl font-bold text-foreground" data-testid="text-tip-amount">
              $0.01
            </div>
            <p className="text-sm text-muted-foreground">PYUSD</p>
          </div>

          {/* Tip Message */}
          <div className="text-left">
            <Label htmlFor="message" className="text-sm font-medium text-foreground mb-2">
              Add a message (optional)
            </Label>
            <Textarea 
              id="message"
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
              data-testid="textarea-tip-message"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full py-3"
              onClick={() => sendTipMutation.mutate()}
              disabled={sendTipMutation.isPending}
              data-testid="button-send-tip"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {sendTipMutation.isPending ? "Sending..." : "Send Tip"}
            </Button>
            <Button 
              variant="ghost"
              className="w-full"
              onClick={() => window.location.href = "/"}
              data-testid="button-cancel-tip"
            >
              Cancel
            </Button>
          </div>

          {/* Security Notice */}
          <div className="bg-accent/5 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <i className="fas fa-shield-alt mr-1"></i>
              Secure micro-tip • No signature required • Instant transfer
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
