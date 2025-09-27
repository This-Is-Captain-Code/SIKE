import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { type User } from "@shared/schema";

interface UserWithBalance extends User {
  balance?: string;
}

interface UserStats {
  tipsSent: number;
  tipsReceived: number;
  thisMonth: string;
}

interface Transaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  status: string;
  message?: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: isAuthenticated,
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet/create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Wallet Created",
        description: "Your wallet has been created and funded with testnet PYUSD!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const res = await apiRequest("PATCH", "/api/profile", { username: newUsername });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Username Updated",
        description: "Your username has been updated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update username. It may already be taken.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      updateUsernameMutation.mutate(username.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const tipUrl = user.username 
    ? `${window.location.origin}/tip/${user.username}`
    : "Set username first";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <i className="fas fa-wallet text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="title-dashboard">
              PYUSD Tipper
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground text-sm font-medium" data-testid="text-user-initials">
                  {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Username Setup */}
        {!user.username && (
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Set Your Username
              </h3>
              <p className="text-muted-foreground mb-4">
                Choose a username to start receiving tips at your custom URL
              </p>
              <form onSubmit={handleUsernameSubmit} className="flex space-x-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    data-testid="input-username"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateUsernameMutation.isPending}
                  data-testid="button-set-username"
                >
                  {updateUsernameMutation.isPending ? "Setting..." : "Set Username"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Wallet Setup */}
        {!user.walletAddress && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Create Your Wallet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create a wallet to start sending and receiving PYUSD tips
              </p>
              <Button 
                onClick={() => createWalletMutation.mutate()}
                disabled={createWalletMutation.isPending}
                data-testid="button-create-wallet"
              >
                {createWalletMutation.isPending ? "Creating..." : "Create Wallet"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wallet Balance Card */}
        {user.walletAddress && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Your Wallet</h2>
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-accent-foreground text-xs font-bold">P</span>
                  </div>
                  <span className="text-sm text-muted-foreground">PYUSD Testnet</span>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-foreground mb-2" data-testid="text-wallet-balance">
                  ${user.balance || '0.00'}
                </div>
                <p className="text-muted-foreground">Available Balance</p>
                <div className="text-xs text-muted-foreground mt-1">
                  Wallet: <span className="font-mono" data-testid="text-wallet-address">
                    {user.walletAddress?.slice(0, 10)}...{user.walletAddress?.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  className="flex-1"
                  onClick={() => copyToClipboard(user.walletAddress || '', 'Wallet address')}
                  data-testid="button-copy-address"
                >
                  <i className="fas fa-copy mr-2"></i>Copy Address
                </Button>
                {user.username && (
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => copyToClipboard(tipUrl, 'Tip URL')}
                    data-testid="button-copy-tip-url"
                  >
                    <i className="fas fa-share mr-2"></i>Share Tip Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tips Sent</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-tips-sent">
                      {stats.tipsSent}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-chart-1/10 flex items-center justify-center">
                    <i className="fas fa-arrow-up text-chart-1"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tips Received</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-tips-received">
                      {stats.tipsReceived}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                    <i className="fas fa-arrow-down text-chart-2"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-month-total">
                      ${stats.thisMonth}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                    <i className="fas fa-calendar text-chart-3"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Your Tip URL */}
        {user.username && (
          <Card className="bg-gradient-to-r from-accent/5 to-primary/5">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Your Tip URL</h3>
              <div className="flex items-center space-x-3 bg-card rounded-md p-3 border">
                <div className="flex-1">
                  <code className="text-sm text-foreground" data-testid="text-tip-url">
                    {tipUrl}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(tipUrl, 'Tip URL')}
                  data-testid="button-copy-tip-url-inline"
                >
                  <i className="fas fa-copy"></i>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this URL and receive $0.01 PYUSD tips instantly when people visit it!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            </div>
            
            <div className="divide-y divide-border">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <i className="fas fa-history text-2xl mb-2 block"></i>
                  <p>No transactions yet</p>
                  <p className="text-xs">Your tips will appear here</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          transaction.fromUserId === user.id 
                            ? 'bg-chart-1/10' 
                            : 'bg-chart-2/10'
                        }`}>
                          <i className={`fas ${
                            transaction.fromUserId === user.id 
                              ? 'fa-arrow-up text-chart-1' 
                              : 'fa-arrow-down text-chart-2'
                          }`}></i>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.fromUserId === user.id ? 'Tip sent' : 'Tip received'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.fromUserId === user.id ? 'text-chart-1' : 'text-chart-2'
                        }`}>
                          {transaction.fromUserId === user.id ? '-' : '+'}${transaction.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">PYUSD</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
