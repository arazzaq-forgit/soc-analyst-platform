import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, X, Mail, Lock, AlertCircle } from 'lucide-react';
import { MOCK_USERS } from '../../services/mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('testpass123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('testpass123');
    try {
      await login(userEmail, 'testpass123');
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isRegisterMode ? 'Create SOC Account' : 'Analyst Authentication'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">AEGIS Zero-Trust Security Access</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@aegis-soc.corp"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm rounded-lg transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegisterMode ? 'Register Analyst' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-xs text-cyan-400 hover:underline"
          >
            {isRegisterMode ? 'Already have an account? Sign in' : 'Need a new account? Register as Analyst'}
          </button>
        </div>

        {/* Quick Demo Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Quick-Login Team Profiles:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_USERS.slice(0, 4).map((u) => (
              <button
                key={u.id}
                onClick={() => handleQuickLogin(u.email)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded text-left transition"
              >
                <div className="text-xs font-medium text-slate-200 truncate">{u.email.split('@')[0]}</div>
                <div className="text-[10px] font-mono uppercase text-cyan-400">{u.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
