import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, ArrowLeft, Smartphone, ShieldQuestion, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+1', label: 'United States / Canada' },
  { code: '+27', label: 'South Africa' },
  { code: '+44', label: 'United Kingdom' },
  { code: '+61', label: 'Australia' },
  { code: '+91', label: 'India' },
  { code: '+234', label: 'Nigeria' },
  { code: '+254', label: 'Kenya' },
  { code: '+255', label: 'Tanzania' },
  { code: '+260', label: 'Zambia' },
  { code: '+263', label: 'Zimbabwe' },
  { code: '+233', label: 'Ghana' },
  { code: '+52', label: 'Mexico' },
  { code: '+55', label: 'Brazil' },
  { code: '+971', label: 'UAE' },
  { code: '+65', label: 'Singapore' },
  { code: '+81', label: 'Japan' },
  { code: '+82', label: 'South Korea' },
  { code: '+92', label: 'Pakistan' },
  { code: '+60', label: 'Malaysia' },
  { code: '+33', label: 'France' },
  { code: '+49', label: 'Germany' },
  { code: '+351', label: 'Portugal' },
  { code: '+34', label: 'Spain' },
  { code: '+39', label: 'Italy' },
  { code: '+7', label: 'Russia' },
  { code: '+971', label: 'UAE' }
];

type RecoveryMethod = 'email' | 'phone' | 'question';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onSwitchToSignup: () => void;
}

export function ForgotPasswordPage({ onBackToLogin, onSwitchToSignup }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email');
  const [countryCode, setCountryCode] = useState('+263');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const sanitizedCountryCode = useMemo(() => {
    return COUNTRY_CODES.find((country) => country.code === countryCode)?.code || '+263';
  }, [countryCode]);

  const requestReset = async () => {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, string> = {
        email: email.trim(),
        recoveryMethod
      };

      if (recoveryMethod === 'phone') {
        body.countryCode = sanitizedCountryCode;
        body.phoneNumber = phoneNumber.trim();
      }

      if (recoveryMethod === 'question') {
        body.securityAnswer = securityAnswer.trim();
      }

      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to process reset request.');
      }

      setCodeSent(true);
      setMessage(data.message || 'Recovery instructions sent.');
      if (data.code) {
        setCode(data.code);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!code.trim()) {
      setError('Recovery code is required.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to reset password.');
      }

      setMessage(data.message || 'Password reset successful.');
      setCodeSent(false);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setIsLoading(false);
    }
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
        className="bg-white rounded-[32px] shadow-2xl border border-natural-accent/10 max-w-lg w-full p-8"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm font-semibold text-natural-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </div>

        <div className="mb-6 text-center">
          <div className="bg-natural-tan text-natural-primary p-4 rounded-2xl inline-block mb-4">
            <ShieldQuestion className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-natural-primary mb-2">Recover account</h1>
          <p className="text-natural-text/60">Use a secure backup method to reset your password.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-12 pr-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Recovery method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'email', label: 'Email', icon: Mail },
                { value: 'phone', label: 'Phone', icon: Smartphone },
                { value: 'question', label: 'Question', icon: ShieldQuestion }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecoveryMethod(value as RecoveryMethod)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                    recoveryMethod === value
                      ? 'bg-natural-primary text-white border-natural-primary'
                      : 'bg-natural-tan/20 text-natural-text border-natural-accent/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {recoveryMethod === 'phone' && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block">Country code</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={`${country.code}-${country.label}`} value={country.code}>
                      {country.code} - {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Phone number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="712345678"
                  className="w-full px-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                />
              </div>
            </div>
          )}

          {recoveryMethod === 'question' && (
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Your security answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Type your answer"
                className="w-full px-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
              />
            </div>
          )}

          {!codeSent ? (
            <button
              type="button"
              onClick={requestReset}
              disabled={isLoading}
              className="w-full py-3 bg-natural-primary text-white font-bold rounded-xl hover:bg-natural-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? 'Sending code...' : 'Send recovery code'}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Recovery code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-12 pr-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-2">Confirm new password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-12 pr-4 py-3 bg-natural-tan/20 border border-natural-accent/20 rounded-xl focus:outline-none focus:border-natural-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={resetPassword}
                disabled={isLoading}
                className="w-full py-3 bg-natural-primary text-white font-bold rounded-xl hover:bg-natural-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Resetting password...' : 'Reset password'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-natural-text/70 mb-3">Need a new account?</p>
          <button
            onClick={onSwitchToSignup}
            className="w-full py-3 bg-natural-tan/30 text-natural-primary font-bold rounded-xl border border-natural-accent/20 hover:bg-natural-tan/50 transition-colors"
          >
            Create Account
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
