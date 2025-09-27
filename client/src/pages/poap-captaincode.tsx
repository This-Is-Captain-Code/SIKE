import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useMutation } from "@tanstack/react-query";

export default function PoapCaptainCodePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [memoryCreated, setMemoryCreated] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [autoSendTriggered, setAutoSendTriggered] = useState(false);

  // Create POAP memory mutation
  const createMemoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/poap/create-memory", {
        receiverUsername: "captaincode",
        memoryMessage: "POAP Memory Created for Captain Code Event"
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMemoryCreated(true);
      setTxHash(data.transactionHash);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "POAP Memory Created! 🎉",
        description: "Your Captain Code POAP memory has been minted on the blockchain!",
      });
      
      // Close window after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Failed to Create POAP Memory",
        description: "Please try again or check your wallet for gas fees",
        variant: "destructive",
      });
      // Close window after error as well
      setTimeout(() => {
        window.close();
      }, 4000);
    },
  });

  // Auto-create memory when authenticated
  useEffect(() => {
    if (isAuthenticated && !autoSendTriggered && !isLoading) {
      setAutoSendTriggered(true);
      createMemoryMutation.mutate();
    }
  }, [isAuthenticated, autoSendTriggered, isLoading]);

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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Preparing your POAP memory</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state
  if (createMemoryMutation.isPending && !memoryCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Creating Your POAP Memory</h2>
            <p className="text-muted-foreground mb-4">Minting your Captain Code POAP on the blockchain...</p>
            <div className="bg-muted rounded-lg p-4 text-left">
              <p className="text-sm text-muted-foreground mb-2">🎯 <span className="font-semibold">Event:</span> Captain Code</p>
              <p className="text-sm text-muted-foreground mb-2">⛓️ <span className="font-semibold">Action:</span> Creating memory NFT</p>
              <p className="text-sm text-muted-foreground">🔐 <span className="font-semibold">Status:</span> Processing on blockchain</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (memoryCreated && txHash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">POAP Memory Created!</h2>
            <p className="text-muted-foreground mb-6">
              Your Captain Code POAP memory has been successfully minted on the blockchain!
            </p>
            
            <div className="bg-muted rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-muted-foreground mb-2">🎯 <span className="font-semibold">Event:</span> Captain Code</p>
              <p className="text-sm text-muted-foreground mb-2">⛓️ <span className="font-semibold">Status:</span> Confirmed</p>
              <p className="text-sm text-muted-foreground mb-2">🔗 <span className="font-semibold">Transaction:</span></p>
              <div className="bg-background rounded p-2 font-mono text-xs break-all">
                {txHash}
              </div>
            </div>

            <Button 
              onClick={() => copyToClipboard(txHash, "Transaction hash")}
              variant="outline" 
              className="w-full mb-4"
              data-testid="button-copy-hash"
            >
              Copy Transaction Hash
            </Button>

            <p className="text-xs text-muted-foreground">
              This window will close automatically in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (createMemoryMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">POAP Creation Failed</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't create your Captain Code POAP memory. Please try again.
            </p>
            
            <Button 
              onClick={() => window.close()}
              className="w-full"
              data-testid="button-close"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback (shouldn't reach here normally)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Captain Code POAP</h2>
          <p className="text-muted-foreground mb-6">
            Welcome to the Captain Code POAP experience!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}