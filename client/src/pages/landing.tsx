import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Rocket } from "lucide-react";
import logoSvg from "@assets/logo.svg";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-lg space-y-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="mx-auto mb-6 relative group">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all duration-300"></div>
              <img 
                src={logoSvg} 
                alt="SIKE Logo" 
                className="h-20 w-20 object-contain mx-auto relative z-10 drop-shadow-lg" 
              />
            </div>
            
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent drop-shadow-md" data-testid="title-app-name">
              SIKE
            </h1>
            
            <p className="text-xl text-white/90 font-light tracking-wide mb-2" data-testid="text-app-description">
              Send micro-tips with ease
            </p>
            
            <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
              The fastest way to send crypto tips to creators, developers, and friends on the blockchain
            </p>
          </div>
        </div>

        {/* Main Action Card */}
        <Card className="glassmorphism-enhanced border-white/20 shadow-2xl">
          <CardContent className="p-10 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground/90">
                Join the Future of Tipping
              </h2>
              <p className="text-muted-foreground/80 text-base leading-relaxed">
                Get started in seconds with automatic wallet creation and instant testnet funding
              </p>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground py-4 px-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 gap-4 pt-4">
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-muted-foreground/80 font-medium">Instant wallet creation & funding</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Rocket className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-muted-foreground/80 font-medium">Seamless crypto micro-tipping</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-muted-foreground/80 font-medium">Secure blockchain transactions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="text-center">
          <p className="text-white/60 text-sm font-medium">
            🔐 Bank-level security • ⚡ Lightning fast • 🌍 Global reach
          </p>
        </div>
      </div>
    </div>
  );
}
