import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, Smartphone, ShieldQuestion, Globe, Camera, MapPin } from 'lucide-react';
import { type Language } from '../translations';

interface SignupProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupPage({ onSuccess, onSwitchToLogin }: SignupProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+263');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cellPhoneNumber, setCellPhoneNumber] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) setPasswordStrength('weak');
    else if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    checkPasswordStrength(pwd);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Profile picture must be an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile picture must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfileImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!profileImageUrl) {
      setError('A profile picture is required');
      return;
    }

    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('WhatsApp number is required');
      return;
    }

    if (!recoveryQuestion.trim() || !recoveryAnswer.trim()) {
      setError('Set a recovery question and answer for account backup protection.');
      return;
    }

    setIsLoading(true);
    const result = await register(email, password, name, language, undefined, undefined, phoneCountryCode, phoneNumber, recoveryQuestion, recoveryAnswer, profileImageUrl, address, cellPhoneNumber);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Registration failed');
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
        className="bg-white rounded-[32px] shadow-2xl border border-natural-accent/10 max-w-md w-full p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="bg-natural-tan text-natural-primary p-4 rounded-2xl inline-block mb-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold text-natural-primary mb-2">Create Account</h1>
          <p className="text-natural-text/60 text-sm">Join AgriSmart for smarter farming</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Required profile details */}
          <div className="space-y-3 pt-2 border-t border-natural-accent/10">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">Profile Picture *</label>
              <label className="flex items-center gap-3 p-3 bg-natural-tan/20 border border-dashed border-natural-accent/30 rounded-lg cursor-pointer hover:bg-natural-tan/40 transition-colors">
                {profileImageUrl ? <img src={profileImageUrl} alt="Profile preview" className="w-12 h-12 rounded-full object-cover" /> : <span className="w-12 h-12 rounded-full bg-natural-tan flex items-center justify-center text-natural-primary"><Camera size={20} /></span>}
                <span className="text-xs text-natural-text/70">{profileImageUrl ? 'Change profile picture' : 'Upload a clear profile picture'}</span>
                <input type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" required={!profileImageUrl} />
              </label>
              <p className="text-[10px] text-natural-text/50 mt-1">Image files only, maximum 2 MB.</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Village, town, or full address" className="w-full pl-10 pr-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors" required />
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@agrismart.com"
                className="w-full pl-10 pr-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">
              Preferred Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
            >
              <option value="English">English</option>
              <option value="Shona">Shona</option>
              <option value="Ndebele">Ndebele</option>
              <option value="Swahili">Swahili</option>
              <option value="Zulu">Zulu</option>
            </select>
          </div>

          {/* Contact numbers */}
          <div className="space-y-2 pt-2 border-t border-natural-accent/10">
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block">
              WhatsApp number *
            </label>

            <div className="grid grid-cols-[110px_1fr] gap-2">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                >
                  <option value="+263">+263</option>
                  <option value="+27">+27</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+91">+91</option>
                  <option value="+234">+234</option>
                  <option value="+254">+254</option>
                  <option value="+255">+255</option>
                  <option value="+260">+260</option>
                  <option value="+233">+233</option>
                  <option value="+52">+52</option>
                  <option value="+55">+55</option>
                  <option value="+971">+971</option>
                  <option value="+65">+65</option>
                  <option value="+81">+81</option>
                  <option value="+82">+82</option>
                </select>
              </div>

              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="712345678"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                  required
                />
              </div>
            </div>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
              <input type="tel" value={cellPhoneNumber} onChange={(e) => setCellPhoneNumber(e.target.value.replace(/\D/g, ''))} placeholder="Cell phone number (optional)" className="w-full pl-9 pr-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors" />
            </div>
          </div>

          {/* Security Question */}
          <div className="space-y-2 pt-2 border-t border-natural-accent/10">
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block">
              Security question
            </label>
            <input
              type="text"
              value={recoveryQuestion}
              onChange={(e) => setRecoveryQuestion(e.target.value)}
              placeholder="e.g. What was your first school?"
              className="w-full px-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
            />

            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block">
              Security answer
            </label>
            <input
              type="text"
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              placeholder="Your backup answer"
              className="w-full px-3 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-accent/60 hover:text-natural-accent"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-natural-accent/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                      passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                      'w-full bg-green-500'
                    }`}
                  />
                </div>
                <span className="text-xs font-semibold text-natural-accent capitalize">
                  {passwordStrength}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-natural-accent block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-accent/40" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-10 py-2 text-sm bg-natural-tan/20 border border-natural-accent/20 rounded-lg focus:outline-none focus:border-natural-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-accent/60 hover:text-natural-accent"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {confirmPassword && password === confirmPassword && (
                <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-4 bg-natural-primary text-white font-bold rounded-lg hover:bg-natural-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-4 text-center">
          <p className="text-xs text-natural-text/70 mb-2">
            Already have an account?
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full py-2.5 bg-natural-tan/30 text-natural-primary font-bold rounded-lg border border-natural-accent/20 hover:bg-natural-tan/50 transition-colors text-sm"
          >
            Sign In
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
