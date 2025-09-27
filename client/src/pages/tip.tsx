import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [tipSent, setTipSent] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [autoSendTriggered, setAutoSendTriggered] = useState(false);

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
        message: "Auto-tip via link"
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
      
      // Close window after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
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
      // Close window after error as well
      setTimeout(() => {
        window.close();
      }, 3000);
    },
  });

  // Auto-send tip when authenticated and recipient is loaded
  useEffect(() => {
    if (isAuthenticated && recipient && !autoSendTriggered && !isLoading && !isLoadingRecipient) {
      setAutoSendTriggered(true);
      sendTipMutation.mutate();
    }
  }, [isAuthenticated, recipient, autoSendTriggered, isLoading, isLoadingRecipient]);

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

  // User not found
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
            <p className="text-sm text-muted-foreground">Window closing automatically...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-sending state (shown while tip is being sent)
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
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-accent mx-auto mb-4 flex items-center justify-center">
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
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-foreground" data-testid="text-tip-amount">
              $0.01
            </div>
            <p className="text-sm text-muted-foreground">PYUSD</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">
              {sendTipMutation.isPending ? "Sending tip..." : "Preparing tip..."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
