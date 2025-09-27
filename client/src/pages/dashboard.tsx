import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { type User, type Transaction } from "@shared/schema";
import { Globe, Search, ExternalLink, Clock } from "lucide-react";
import logoSvg from "@assets/logo.svg";

interface UserWithBalance extends User {
  balance?: string;
}

interface UserStats {
  tipsSent: number;
  tipsReceived: number;
  thisMonth: string;
}

interface ENSNameInfo {
  name: string;
  available: boolean;
  address?: string;
  expires?: string;
  registered?: boolean;
  avatar?: string;
  error?: string;
  normalizedName?: string;
}

interface ENSCost {
  cost?: string;
  currency: string;
  duration: number;
  error?: string;
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [ensSearchName, setEnsSearchName] = useState("");
  const [selectedEnsName, setSelectedEnsName] = useState("");

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

  // Query for ENS name info when a name is selected
  const { data: ensNameInfo, isLoading: ensNameInfoLoading, error: ensNameInfoError } = useQuery<ENSNameInfo>({
    queryKey: ["/api/ens/info", selectedEnsName],
    enabled: isAuthenticated && selectedEnsName.length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/ens/info/${encodeURIComponent(selectedEnsName)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch ENS name info" }));
        throw new Error(errorData.message || "Failed to fetch ENS name info");
      }
      return response.json();
    },
  });

  // Query for registration cost estimate
  const { data: ensCostInfo } = useQuery<ENSCost>({
    queryKey: ["/api/ens/cost", selectedEnsName],
    enabled: isAuthenticated && selectedEnsName.length > 0 && ensNameInfo?.available,
    queryFn: async () => {
      const response = await fetch(`/api/ens/cost/${encodeURIComponent(selectedEnsName)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch cost info" }));
        throw new Error(errorData.message || "Failed to fetch cost info");
      }
      return response.json();
    },
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet/create");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Wallet Created",
        description: data.needsFunding 
          ? "Your wallet has been created! Please fund it with testnet tokens to start tipping."
          : "Your wallet has been created successfully!",
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

  const handleEnsSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ensSearchName.trim()) {
      setSelectedEnsName(ensSearchName.trim());
    }
  };

  const formatExpirationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
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
            <img src={logoSvg} alt="SIKE Logo" className="h-8 w-8 object-contain" />
            <h1 className="text-lg font-semibold text-foreground" data-testid="title-dashboard">
              SIKE
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
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <span>Wallet:</span>
                  <span className="font-mono" data-testid="text-wallet-address">
                    {user.walletAddress?.slice(0, 10)}...{user.walletAddress?.slice(-6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(user.walletAddress || '', 'Wallet address')}
                    className="ml-1 p-1 hover:bg-muted rounded transition-colors"
                    data-testid="button-copy-wallet-address"
                    title="Copy wallet address"
                  >
                    <i className="fas fa-copy text-xs text-muted-foreground hover:text-foreground"></i>
                  </button>
                </div>
              </div>

              {/* Funding Instructions for Zero/Low Balance */}
              {parseFloat(user.balance || '0') < 0.01 && (
                <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mt-0.5">
                      <i className="fas fa-exclamation-triangle text-orange-600 dark:text-orange-400 text-xs"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                        Fund Your Wallet
                      </h4>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                        Your wallet needs testnet tokens to send tips. Get free tokens from these faucets:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-orange-700 dark:text-orange-300">1. Get Sepolia ETH (for gas):</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                            onClick={() => window.open('https://faucet.sepolia.dev/', '_blank')}
                          >
                            <i className="fas fa-external-link-alt mr-1"></i>ETH Faucet
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-orange-700 dark:text-orange-300">2. Get testnet PYUSD:</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                            onClick={() => window.open('https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd', '_blank')}
                          >
                            <i className="fas fa-external-link-alt mr-1"></i>PYUSD Faucet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

        {/* ENS Domain Lookup */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span>ENS Domain Lookup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Form */}
            <form onSubmit={handleEnsSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ens-search">Search ENS Domain</Label>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <Input
                      id="ens-search"
                      type="text"
                      placeholder="Enter name (e.g., alice or alice.eth)"
                      value={ensSearchName}
                      onChange={(e) => setEnsSearchName(e.target.value)}
                      data-testid="input-ens-search"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      .eth
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!ensSearchName.trim() || ensNameInfoLoading}
                    data-testid="button-search-ens"
                  >
                    {ensNameInfoLoading ? "Searching..." : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </form>

            {/* Search Results */}
            {selectedEnsName && (
              <div className="space-y-4">
                <Separator />
                
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Results for "{selectedEnsName}.eth"</h4>
                  {ensNameInfo && !ensNameInfo.error && (
                    <Badge 
                      variant={ensNameInfo.available ? "default" : "secondary"}
                      data-testid="badge-availability-status"
                    >
                      {ensNameInfo.available ? "Available" : "Registered"}
                    </Badge>
                  )}
                </div>

                {ensNameInfoLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Looking up ENS name...</p>
                  </div>
                )}

                {ensNameInfoError && (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {ensNameInfoError.message || "Error looking up ENS name. Please try again."}
                    </p>
                  </div>
                )}

                {ensNameInfo && ensNameInfo.error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {ensNameInfo.error}
                    </p>
                  </div>
                )}

                {ensNameInfo && !ensNameInfo.error && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="text-center">
                      <div className={`text-4xl mb-2 ${ensNameInfo.available ? 'text-green-500' : 'text-blue-500'}`}>
                        {ensNameInfo.available ? '✓' : '🏠'}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-domain-status">
                        {ensNameInfo.available ? 'Available!' : 'Registered'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ensNameInfo.available 
                          ? 'This ENS name is available for registration'
                          : 'This ENS name is already owned'
                        }
                      </p>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Domain:</span>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded" data-testid="text-full-domain-name">
                              {ensNameInfo.normalizedName || ensNameInfo.name}.eth
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${ensNameInfo.normalizedName || ensNameInfo.name}.eth`, 'Domain name')}
                              data-testid="button-copy-domain-name"
                              className="h-6 w-6 p-0"
                            >
                              📋
                            </Button>
                          </div>
                        </div>

                        {ensNameInfo.address && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Address:</span>
                            <div className="flex items-center space-x-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono" data-testid="text-resolved-address">
                                {ensNameInfo.address.slice(0, 10)}...{ensNameInfo.address.slice(-6)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(ensNameInfo.address!, 'Address')}
                                data-testid="button-copy-resolved-address"
                                className="h-6 w-6 p-0"
                              >
                                📋
                              </Button>
                            </div>
                          </div>
                        )}

                        {ensNameInfo.expires && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Expires:</span>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm" data-testid="text-expiration-date">
                                {formatExpirationDate(ensNameInfo.expires)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cost Info */}
                      {ensNameInfo.available && ensCostInfo && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold text-foreground">Estimated Cost</h5>
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            {ensCostInfo.cost ? (
                              <>
                                <div className="text-xl font-bold text-foreground" data-testid="text-registration-cost">
                                  {ensCostInfo.cost} {ensCostInfo.currency}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  for {ensCostInfo.duration} year{ensCostInfo.duration > 1 ? 's' : ''}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  * Estimated - actual pricing may vary
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {ensCostInfo.error || 'Cost unavailable'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                      {ensNameInfo.available ? (
                        <Button 
                          onClick={() => window.open(`https://app.ens.domains/name/${ensNameInfo.normalizedName || ensNameInfo.name}.eth`, '_blank')}
                          data-testid="button-register-ens"
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Register on ENS App</span>
                        </Button>
                      ) : ensNameInfo.address && (
                        <Button 
                          variant="outline"
                          onClick={() => window.open(`https://etherscan.io/address/${ensNameInfo.address}`, '_blank')}
                          data-testid="button-view-owner"
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>View Owner</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedEnsName && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Search for ENS names to check availability and get registration info
              </p>
            )}
          </CardContent>
        </Card>

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
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-foreground">
                              {transaction.fromUserId === user.id ? 'Tip sent' : 'Tip received'}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transaction.status === 'confirmed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : transaction.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'Unknown date'}
                          </p>
                          {transaction.transactionHash ? (
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-xs text-muted-foreground font-mono">
                                TX: {transaction.transactionHash.slice(0, 8)}...{transaction.transactionHash.slice(-6)}
                              </p>
                              <button
                                onClick={() => copyToClipboard(transaction.transactionHash!, 'Transaction hash')}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                data-testid={`button-copy-tx-${transaction.id}`}
                                title="Copy transaction hash"
                              >
                                <i className="fas fa-copy text-xs text-muted-foreground hover:text-foreground"></i>
                              </button>
                              <button
                                onClick={() => window.open(`https://sepolia.etherscan.io/tx/${transaction.transactionHash}`, '_blank')}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                data-testid={`button-view-tx-${transaction.id}`}
                                title="View on Etherscan"
                              >
                                <i className="fas fa-external-link-alt text-xs text-muted-foreground hover:text-foreground"></i>
                              </button>
                            </div>
                          ) : transaction.status === 'failed' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Transaction failed before reaching blockchain
                            </p>
                          )}
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
