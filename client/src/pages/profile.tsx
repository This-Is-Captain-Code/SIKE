import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PublicUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;

  // Fetch user data
  const { data: user, isLoading } = useQuery<PublicUser>({
    queryKey: ["/api/users", username],
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-user-slash text-2xl text-destructive"></i>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The user @{username} does not exist.
            </p>
            <Button onClick={() => window.location.href = "/"} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.username;

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : (user.firstName?.[0] || user.username?.[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            data-testid="button-go-back"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </Button>
          <div className="flex items-center space-x-2">
            <i className="fas fa-share text-muted-foreground"></i>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-r from-primary to-accent mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-white" data-testid="text-profile-initials">
                {initials}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-profile-name">
              {displayName}
            </h1>
            <p className="text-lg text-muted-foreground mb-4" data-testid="text-profile-username">
              @{user.username}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Send a micro-tip</p>
              <div className="text-2xl font-bold text-foreground" data-testid="text-tip-amount">
                $0.01 PYUSD
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Just click below to send instantly!
              </p>
            </div>

            <Button 
              className="w-full py-3"
              onClick={() => window.location.href = `/tip/${user.username}`}
              data-testid="button-send-tip"
            >
              <i className="fas fa-gift mr-2"></i>Send Tip Now
            </Button>
          </CardContent>
        </Card>

        {/* Profile Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground" data-testid="text-tips-received">
                -
              </div>
              <p className="text-sm text-muted-foreground">Tips Received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground" data-testid="text-member-since">
                New User
              </div>
              <p className="text-sm text-muted-foreground">Member Since</p>
            </CardContent>
          </Card>
        </div>

        {/* About Section */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-4">About Micro-Tipping</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <i className="fas fa-zap mr-2 text-accent"></i>
                Instant PYUSD transfers without gas fees
              </p>
              <p>
                <i className="fas fa-shield-alt mr-2 text-accent"></i>
                Secure and transparent on-chain transactions
              </p>
              <p>
                <i className="fas fa-heart mr-2 text-accent"></i>
                Support creators with micro-tips
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
