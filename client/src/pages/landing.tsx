import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoSvg from "@assets/logo.svg";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto mb-4">
            <img src={logoSvg} alt="SIKE Logo" className="h-16 w-16 object-contain mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="title-app-name">
            SIKE
          </h1>
          <p className="text-white/80" data-testid="text-app-description">
            Send micro-tips with ease
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glassmorphism">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome to SIKE
              </h2>
              <p className="text-muted-foreground text-sm">
                Create your account and start sending micro-tips instantly
              </p>
            </div>

            <Button 
              className="w-full bg-primary text-primary-foreground py-3 font-medium"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Get Started
            </Button>

            <div className="text-center text-muted-foreground text-xs space-y-2">
              <p>✨ Instant wallet creation</p>
              <p>🚀 Free testnet funding</p>
              <p>💸 Seamless micro-tipping</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-white/60 text-xs">
          <p>🔐 Secure wallet creation • 🚀 Instant testnet funding</p>
        </div>
      </div>
    </div>
  );
}
