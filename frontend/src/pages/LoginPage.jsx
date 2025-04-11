import React from 'react';
import { login } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react'; // Import an icon

export function LoginPage() {
  const handleLogin = () => {
    login(); // This function redirects the window to the backend /login route
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 border rounded-lg shadow-lg bg-card text-card-foreground text-center">
        <h1 className="text-2xl font-semibold mb-6">Email App Login</h1>
        <p className="mb-8 text-muted-foreground">Please log in with your Google account to continue.</p>
        <Button onClick={handleLogin} size="lg">
          <Mail className="mr-2 h-5 w-5" /> Login with Google
        </Button>
      </div>
    </div>
  );
}
