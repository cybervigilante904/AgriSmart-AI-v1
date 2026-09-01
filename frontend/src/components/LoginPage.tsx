import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onForgotPassword?: () => void;
}

export function LoginPage({ onSuccess, onSwitchToSignup, onForgotPassword }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-natural-primary/5 via-natural-tan/10 to-natural-accent/5 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] shadow-2xl border border-natural-accent/10 max-w-md w-full p-8"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-natural-tan text-natural-primary p-4 rounded-2xl inline-block mb-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold text-natural-primary mb-2">Welcome Back</h1>
          <p className="text-natural-text/60">Sign in to your AgriSmart account</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@agrismart.com"
                className="w-full pl-12 pr-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-natural-accent/60 hover:text-natural-accent"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-natural-primary text-white font-bold rounded-xl hover:bg-natural-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full py-2 text-sm font-semibold text-natural-primary hover:text-natural-primary/80 transition-colors"
          >
            Forgot your password?
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-natural-accent/10" />
          <span className="text-xs text-natural-accent/60">OR</span>
          <div className="flex-1 h-px bg-natural-accent/10" />
        </div>

        {/* Signup Link */}
        <div className="text-center">
          <p className="text-sm text-natural-text/70 mb-3">
            Don't have an account?
          </p>
          <button
            onClick={onSwitchToSignup}
            className="w-full py-3 bg-natural-tan/30 text-natural-primary font-bold rounded-xl border border-natural-accent/20 hover:bg-natural-tan/50 transition-colors"
          >
            Create Account
          </button>
        </div>

        {/* Demo Info */}
        <div className="mt-6 p-3 bg-natural-tan/20 rounded-xl border border-natural-accent/10 text-xs text-natural-text/70">
          <p className="font-semibold text-natural-accent mb-1">Demo Account:</p>
          <p>📧 demo@agrismart.com</p>
          <p>🔐 demo@123</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
