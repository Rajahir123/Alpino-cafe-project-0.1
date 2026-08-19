import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Lock, Eye, EyeOff, ShieldCheck, Zap, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KitchenPasscodeGateProps {
  children: React.ReactNode;
}

const KITCHEN_PASSWORD = 'Alpino@2026';

export default function KitchenPasscodeGate({ children }: KitchenPasscodeGateProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const savedAuth = localStorage.getItem('alpino_kitchen_authorized');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === KITCHEN_PASSWORD) {
      setIsAuthorized(true);
      localStorage.setItem('alpino_kitchen_authorized', 'true');
      setError(false);
      setErrorMessage('');
    } else {
      setError(true);
      setErrorMessage('Incorrect Kitchen Password. Please enter the valid authorization key.');
      setAttempts(prev => prev + 1);
      setPassword('');
      setTimeout(() => setError(false), 600);
    }
  };

  const handleClearAuth = () => {
    localStorage.removeItem('alpino_kitchen_authorized');
    setIsAuthorized(false);
    setPassword('');
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="theme-light min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans selection:bg-red-600 selection:text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-neutral-200/90 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        {/* Brand & Security Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-3xl flex items-center justify-center mb-5 text-red-600 shadow-inner">
            <ChefHat size={38} className="animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 block mb-1">
            Alpino Protein Café
          </span>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-neutral-950">
            KITCHEN <span className="text-red-600">COMMAND</span>
          </h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">
            Service Terminal & Order Fulfillment Access
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-neutral-100 border border-neutral-200 px-3.5 py-1.5 rounded-full">
            <ShieldCheck size={13} className="text-red-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-700">Protected Endpoint</span>
          </div>
        </div>

        {/* Passcode Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 px-1">
              Enter Kitchen Password
            </label>
            <div className="relative">
              <input
                id="kitchen-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full bg-neutral-50 text-neutral-950 border ${
                  error ? 'border-red-600 bg-red-50/40 ring-2 ring-red-600/20' : 'border-neutral-200 focus:border-red-600'
                } rounded-2xl px-5 py-4 text-center text-lg font-bold tracking-wider outline-none transition-all placeholder:text-neutral-400 placeholder:text-sm placeholder:font-normal`}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-xl transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 py-2.5 px-3 rounded-xl"
              >
                <ShieldAlert size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="btn-unlock-kitchen"
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black italic uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-red-600/25 hover:shadow-red-600/40 group"
          >
            <span>UNLOCK KITCHEN ACCESS</span>
            <Zap size={16} className="group-hover:scale-125 transition-transform" />
          </button>
        </form>

        {/* Back to Home Navigation */}
        <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} /> Return to Storefront
          </button>

          {attempts > 0 && (
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">
              Attempts: {attempts}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
