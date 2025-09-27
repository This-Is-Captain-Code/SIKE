import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Search, ArrowLeft, Globe, User, Clock, ExternalLink } from "lucide-react";

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

export default function ENSLookup() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchName, setSearchName] = useState("");
  const [selectedName, setSelectedName] = useState("");

  // Query for ENS name info when a name is selected
  const { data: nameInfo, isLoading: nameInfoLoading, error: nameInfoError } = useQuery<ENSNameInfo>({
    queryKey: ["/api/ens/info", selectedName],
    enabled: isAuthenticated && selectedName.length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/ens/info/${encodeURIComponent(selectedName)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch ENS name info" }));
        throw new Error(errorData.message || "Failed to fetch ENS name info");
      }
      return response.json();
    },
  });

  // Query for registration cost estimate
  const { data: costInfo } = useQuery<ENSCost>({
    queryKey: ["/api/ens/cost", selectedName],
    enabled: isAuthenticated && selectedName.length > 0 && nameInfo?.available,
    queryFn: async () => {
      const response = await fetch(`/api/ens/cost/${encodeURIComponent(selectedName)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch cost info" }));
        throw new Error(errorData.message || "Failed to fetch cost info");
      }
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchName.trim()) {
      setSelectedName(searchName.trim());
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Login Required
            </h3>
            <p className="text-muted-foreground mb-4">
              Please log in to use the ENS lookup feature
            </p>
            <Button onClick={() => window.location.href = '/api/login'}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" data-testid="link-back-dashboard">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="title-ens-lookup">
              ENS Domain Lookup
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground text-sm font-medium" data-testid="text-user-initials">
                  {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search ENS Names</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ens-search">ENS Name</Label>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <Input
                      id="ens-search"
                      type="text"
                      placeholder="Enter ENS name (e.g., alice or alice.eth)"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      data-testid="input-ens-search"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      .eth
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!searchName.trim() || nameInfoLoading}
                    data-testid="button-search-ens"
                  >
                    {nameInfoLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Enter the name without .eth suffix (it will be added automatically)
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {selectedName && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Results for "{selectedName}.eth"</span>
                {nameInfo && !nameInfo.error && (
                  <Badge 
                    variant={nameInfo.available ? "default" : "secondary"}
                    data-testid="badge-availability-status"
                  >
                    {nameInfo.available ? "Available" : "Registered"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nameInfoLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Looking up ENS name...</p>
                </div>
              )}

              {nameInfoError && (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">
                    <Globe className="h-8 w-8 mx-auto mb-2" />
                  </div>
                  <p className="text-red-600 dark:text-red-400">
                    {nameInfoError.message || "Error looking up ENS name. Please try again."}
                  </p>
                </div>
              )}

              {nameInfo && nameInfo.error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-red-500">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                        Lookup Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {nameInfo.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {nameInfo && !nameInfo.error && (
                <div className="space-y-6">
                  {/* Availability Status */}
                  <div className="text-center">
                    <div className={`text-6xl mb-4 ${nameInfo.available ? 'text-green-500' : 'text-blue-500'}`}>
                      {nameInfo.available ? '✓' : '🏠'}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2" data-testid="text-domain-status">
                      {nameInfo.available ? 'Available for Registration!' : 'Already Registered'}
                    </h3>
                    <p className="text-muted-foreground">
                      {nameInfo.available 
                        ? 'This ENS name is available and can be registered'
                        : 'This ENS name is already owned by someone else'
                      }
                    </p>
                  </div>

                  <Separator />

                  {/* Domain Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Domain Information</span>
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Full Name:</span>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded" data-testid="text-full-domain-name">
                              {nameInfo.normalizedName || nameInfo.name}.eth
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${nameInfo.normalizedName || nameInfo.name}.eth`, 'Domain name')}
                              data-testid="button-copy-domain-name"
                              className="h-6 w-6 p-0"
                            >
                              📋
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={nameInfo.available ? "default" : "secondary"}>
                            {nameInfo.available ? "Available" : "Registered"}
                          </Badge>
                        </div>

                        {nameInfo.address && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Resolves to:</span>
                            <div className="flex items-center space-x-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono" data-testid="text-resolved-address">
                                {nameInfo.address.slice(0, 10)}...{nameInfo.address.slice(-6)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(nameInfo.address!, 'Address')}
                                data-testid="button-copy-resolved-address"
                                className="h-6 w-6 p-0"
                              >
                                📋
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`https://etherscan.io/address/${nameInfo.address}`, '_blank')}
                                data-testid="button-view-address-etherscan"
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {nameInfo.expires && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expires:</span>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid="text-expiration-date">
                                {formatExpirationDate(nameInfo.expires)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Registration Cost (if available) */}
                    {nameInfo.available && costInfo && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center space-x-2">
                          <span>💰</span>
                          <span>Estimated Cost</span>
                        </h4>
                        
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          {costInfo.cost ? (
                            <>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-foreground" data-testid="text-registration-cost">
                                  {costInfo.cost} {costInfo.currency}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  for {costInfo.duration} year{costInfo.duration > 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground text-center">
                                * Estimated cost - actual pricing may vary
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              {costInfo.error || 'Cost information unavailable'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Avatar (if available) */}
                    {nameInfo.avatar && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Avatar</span>
                        </h4>
                        
                        <div className="flex justify-center">
                          <img 
                            src={nameInfo.avatar} 
                            alt={`${nameInfo.name}.eth avatar`}
                            className="h-20 w-20 rounded-full border-2 border-border"
                            data-testid="img-ens-avatar"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <Separator />
                  
                  <div className="flex justify-center space-x-4">
                    {nameInfo.available ? (
                      <Button 
                        onClick={() => window.open(`https://app.ens.domains/name/${nameInfo.normalizedName || nameInfo.name}.eth`, '_blank')}
                        data-testid="button-register-ens"
                        className="flex items-center space-x-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Register on ENS App</span>
                      </Button>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground">
                          This domain is already registered.
                        </p>
                        {nameInfo.address && (
                          <Button 
                            variant="outline"
                            onClick={() => window.open(`https://etherscan.io/address/${nameInfo.address}`, '_blank')}
                            data-testid="button-view-owner"
                            className="flex items-center space-x-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View Owner on Etherscan</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              About ENS Domains
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>ENS (Ethereum Name Service)</strong> converts long wallet addresses into 
                human-readable names like "alice.eth".
              </p>
              <p>
                <strong>Domain Requirements:</strong> Names must be at least 3 characters long 
                and can contain letters, numbers, and hyphens.
              </p>
              <p>
                <strong>Registration:</strong> Use the official ENS app at ens.domains to register 
                available domains. Costs vary by length.
              </p>
              <p>
                <strong>Blockchain:</strong> ENS names are resolved on Ethereum mainnet, not testnets.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}