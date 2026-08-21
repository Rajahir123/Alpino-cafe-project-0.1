import React, { useState, useEffect } from 'react';
import { PLANS } from '../constants';
import { 
  SHAKE_MENU_5_DAYS,
  SHAKE_PRO_MENU_20_DAYS,
  SMOOTHIE_MENU_5_DAYS,
  SMOOTHIE_PRO_MENU_20_DAYS,
  BOWL_MENU_5_DAYS,
  BOWL_PRO_MENU_20_DAYS,
  COMBO_MENU_5_DAYS,
  COMBO_PRO_MENU_20_DAYS,
  BOWL_SMOOTHIE_MENU_5_DAYS,
  BOWL_SMOOTHIE_PRO_MENU_20_DAYS 
} from '../constants/planMenus';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Star, 
  Zap, 
  ChevronRight, 
  Fuel, 
  ShieldCheck, 
  Sparkles, 
  Flame, 
  ArrowRight, 
  Utensils, 
  Clock, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  Activity,
  HeartHandshake
} from 'lucide-react';
import DynamicLogo from '../components/DynamicLogo';

// Macro and feature annotations for rich card presentation
const PLAN_METRICS: Record<string, { 
  tagline: string; 
  proteinPerServing: string; 
  savingsBadge?: string; 
  isPopular?: boolean;
  isBestValue?: boolean;
  category: 'shake' | 'smoothie' | 'food' | 'combo';
  icon: string;
  originalPrice: number;
}> = {
  trial_shakes_only: {
    tagline: 'Rapid post-workout whey isolate hydration',
    proteinPerServing: '32g Whey Isolate',
    savingsBadge: 'Starter Deal',
    category: 'shake',
    icon: '🥤',
    originalPrice: 899
  },
  trial_smoothies_only: {
    tagline: 'Cold-pressed micronutrient & antioxidant power',
    proteinPerServing: '28g Bio-Protein',
    category: 'smoothie',
    icon: '🍓',
    originalPrice: 1549
  },
  trial_food: {
    tagline: 'High-protein gourmet grilled bowl with complex carbs',
    proteinPerServing: '40g-48g Solid Protein',
    savingsBadge: 'High Demand',
    category: 'food',
    icon: '🥗',
    originalPrice: 1699
  },
  trial_shakes: {
    tagline: 'Complete solid meal + instant post-workout fuel',
    proteinPerServing: '72g Daily Protein Matrix',
    isPopular: true,
    category: 'combo',
    icon: '⚡',
    originalPrice: 2499
  },
  trial_smoothies: {
    tagline: 'Gourmet meal + clean raw smoothie synergy',
    proteinPerServing: '68g Superfood Nutrition',
    category: 'combo',
    icon: '✨',
    originalPrice: 2799
  },
  pro_shakes_only: {
    tagline: 'Consistent 20-day anabolic post-workout protocol',
    proteinPerServing: '32g Whey Isolate / Day',
    category: 'shake',
    icon: '🥤',
    originalPrice: 3199
  },
  pro_smoothies_only: {
    tagline: '20 days of daily cold-crafted antioxidant nutrition',
    proteinPerServing: '28g Bio-Protein / Day',
    category: 'smoothie',
    icon: '🍓',
    originalPrice: 5499
  },
  pro_food: {
    tagline: '20 chef-crafted gourmet chef protein bowls',
    proteinPerServing: '42g-50g Real Food Protein',
    isPopular: true,
    category: 'food',
    icon: '🥗',
    originalPrice: 5799
  },
  pro_shakes: {
    tagline: 'Full transformation regimen: 20 Gourmet Bowls + 20 Shakes',
    proteinPerServing: '75g+ Complete Daily Fuel',
    isBestValue: true,
    category: 'combo',
    icon: '🔥',
    originalPrice: 8499
  },
  pro_smoothies: {
    tagline: 'The ultimate luxury nutrition stack for elite recovery',
    proteinPerServing: '70g+ Performance Protocol',
    isPopular: true,
    category: 'combo',
    icon: '👑',
    originalPrice: 9799
  }
};

export default function PlanSelection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'trial' | 'pro'>('all');

  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => {
      document.body.classList.remove("theme-light");
    };
  }, []);

  useEffect(() => {
    const handleIntent = async () => {
      const intent = sessionStorage.getItem('plan_intent');
      if (intent && profile && !saving) {
        sessionStorage.removeItem('plan_intent');
        await handleSelectPlan(intent);
      }
    };
    handleIntent();
  }, [profile]);

  const handleSelectPlan = async (planId: string) => {
    if (!profile) {
      sessionStorage.setItem('plan_intent', planId);
      navigate('/login');
      return;
    }
    
    try {
      setSaving(true);
      setSelectedPlanId(planId);

      // 1. Set plan selection and status to pending in user document
      const userRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(userRef, {
          planId: planId,
          planStatus: 'pending',
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'Plan Selection Action (User Update)');
      }

      // 2. Create a payment record
      const selectedPlan = PLANS.find(p => p.id === planId);
      const paymentId = `pay_${Date.now()}`;
      const paymentRef = doc(db, 'payments', paymentId);
      try {
        await setDoc(paymentRef, {
          id: paymentId,
          userId: profile.uid,
          userName: profile.name,
          userEmail: profile.email,
          planId: planId,
          planName: selectedPlan?.name || 'Unknown',
          amount: selectedPlan?.price || 0,
          status: 'pending',
          createdAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'Plan Selection Action (Payment Create)');
      }

      // 3. Route user according to onboarding status
      if (!profile.phone || !profile.address || !profile.gender || !profile.primaryGoal) {
        navigate('/setup');
      } else {
        navigate('/payment');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'Plan Selection Action');
    } finally {
      setSaving(false);
      setSelectedPlanId(null);
    }
  };

  // Filter plans according to selected tabs
  const filteredPlans = PLANS.filter(plan => {
    // Duration tab filter
    if (activeTab === 'trial' && plan.type !== 'trial') return false;
    if (activeTab === 'pro' && plan.type !== 'pro') return false;
    return true;
  });

  return (
    <div className="theme-light min-h-screen bg-[#f8fafc] text-neutral-900 font-sans selection:bg-red-600 selection:text-white relative overflow-hidden">
      {/* Soft Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] bg-red-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[700px] h-[700px] bg-rose-500/5 rounded-full blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.03),transparent_50%)]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-red-50 border border-red-200 rounded-2xl group-hover:border-red-500 transition-all shadow-sm">
            <DynamicLogo showText={false} size={32} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-600 block">Alpino Protein Café</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/menu"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Utensils size={14} className="text-red-600" />
            <span>Explore Menu</span>
          </Link>

          {profile && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20"
            >
              <span>My Portal</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-10 md:pt-14 pb-8 md:pb-12 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 shadow-sm"
        >
          <Sparkles size={13} className="text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Precision Bio-Active Nutrition</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none text-neutral-950 font-display">
            SELECT YOUR <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">PROTEIN PLAN</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-[0.2em] text-neutral-600 max-w-2xl mx-auto">
            Lab-calibrated macro precision, zero refined fillers, delivered hot & fresh to your doorstep daily.
          </p>
        </motion.div>

        {/* Feature Highlights Ticker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl mx-auto pt-2">
          {[
            { icon: ShieldCheck, title: '100% Purity Certified', desc: 'Real whole foods only' },
            { icon: Activity, title: '30g-75g+ Protein/Day', desc: 'Maximized bio-uptake' },
            { icon: HeartHandshake, title: 'Flexible Freeze', desc: 'Pause days anytime' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 shadow-sm flex flex-col items-center justify-center text-center group hover:border-red-500/40 hover:shadow-md transition-all"
              >
                <Icon size={18} className="text-red-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-900">{item.title}</span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-tight">{item.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Duration / Phase Tabs */}
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex p-1.5 rounded-2xl bg-neutral-100 border border-neutral-200 shadow-inner">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-white text-neutral-950 shadow-md border border-neutral-200' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Plans ({PLANS.length})
            </button>
            <button
              onClick={() => setActiveTab('trial')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trial' 
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Zap size={14} className={activeTab === 'trial' ? 'text-white' : 'text-amber-500'} />
              <span>5-Day Trial (Starter)</span>
            </button>
            <button
              onClick={() => setActiveTab('pro')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pro' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Star size={14} className={activeTab === 'pro' ? 'text-white' : 'text-amber-500'} />
              <span>20-Day Pro (Monthly)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Showcase Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {filteredPlans.length === 0 ? (
          <div className="text-center py-20 bg-white border border-neutral-200 rounded-3xl max-w-xl mx-auto shadow-sm">
            <Info size={32} className="text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-black uppercase tracking-wider text-neutral-900">No plans match this specific filter</h3>
            <p className="text-xs text-neutral-500 mt-1 uppercase font-bold">Try resetting the duration tab or category filters above.</p>
            <button
              onClick={() => {
                setActiveTab('all');
              }}
              className="mt-4 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-red-700 transition-all shadow-sm"
            >
              Show All Plans
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredPlans.map((plan, idx) => {
                const meta = PLAN_METRICS[plan.id] || {
                  tagline: plan.description,
                  proteinPerServing: '35g+ Protein',
                  category: 'food',
                  icon: '⚡',
                  originalPrice: Math.round(plan.price * 1.3)
                };

                const isPro = plan.type === 'pro';
                const perDayCost = Math.round(plan.price / plan.duration);
                const isSelected = selectedPlanId === plan.id;
                const isSavingThis = saving && isSelected;

                return (
                  <motion.div
                    key={plan.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    whileHover={{ y: -6 }}
                    className={`relative rounded-[2.5rem] p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group overflow-hidden bg-white ${
                      isPro 
                        ? 'border-2 border-red-500/25 hover:border-red-600 shadow-lg hover:shadow-2xl hover:shadow-red-500/15' 
                        : 'border-2 border-neutral-200 hover:border-amber-500/50 shadow-md hover:shadow-xl hover:shadow-amber-500/10'
                    }`}
                  >
                    {/* Top Decorative Glow Corner */}
                    <div 
                      className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-[70px] pointer-events-none transition-opacity ${
                        isPro ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-amber-500/10 group-hover:bg-amber-500/15'
                      }`} 
                    />

                    {/* Badge Pill Top */}
                    <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            isPro 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isPro ? '20 Days • Pro Routine' : '5 Days • Trial Starter'}
                        </span>
                        {meta.isBestValue && (
                          <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 font-black">
                            Best Value
                          </span>
                        )}
                        {meta.isPopular && !meta.isBestValue && (
                          <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 font-black">
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="text-xl" title={meta.category}>
                        {meta.icon}
                      </div>
                    </div>

                    {/* Plan Title & Subtitle */}
                    <div className="space-y-2 mb-5 relative z-10">
                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neutral-900 group-hover:text-red-600 transition-colors italic leading-tight">
                        {plan.name.includes('—') ? plan.name.split('—')[1]?.trim() : plan.name}
                      </h3>
                      <p className="text-xs text-neutral-600 font-medium leading-relaxed line-clamp-2">
                        {meta.tagline}
                      </p>
                    </div>

                    {/* Nutrition & Macro Indicator Box */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 mb-6 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                        <span className="text-neutral-700 flex items-center gap-1.5">
                          <Activity size={13} className="text-red-600" /> Daily Target:
                        </span>
                        <span className="text-red-600 font-mono font-black">{meta.proteinPerServing}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/80">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Includes:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.includes.map(inc => (
                            <span 
                              key={inc} 
                              className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[9px] font-black uppercase tracking-wider text-neutral-800"
                            >
                              {inc}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-[9px] font-black uppercase tracking-wider text-red-700">
                            Fresh Prep
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Features Checklist / Daily Menu Rotation */}
                    <div className="space-y-2 mb-6 relative z-10 flex-1">
                      {plan.id === 'trial_shakes_only' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                            <span>5-Day Shake Menu</span>
                          </div>
                          {SHAKE_MENU_5_DAYS.map((shakeItem, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                              <span className="leading-tight">{shakeItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : plan.id === 'pro_shakes_only' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-amber-500 shrink-0" />
                              <span>20-Day Pro Shake Schedule</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">20 Days</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                            {SHAKE_PRO_MENU_20_DAYS.map((shakeItem, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                                <span className="leading-tight">{shakeItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : plan.id === 'trial_smoothies_only' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-red-500 shrink-0" />
                            <span>5-Day Smoothie Menu</span>
                          </div>
                          {SMOOTHIE_MENU_5_DAYS.map((smoothieItem, smIdx) => (
                            <div key={smIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                              <span className="leading-tight">{smoothieItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : plan.id === 'pro_smoothies_only' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-red-500 shrink-0" />
                              <span>20-Day Pro Smoothie Schedule</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">20 Days</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                            {SMOOTHIE_PRO_MENU_20_DAYS.map((smoothieItem, smIdx) => (
                              <div key={smIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                <span className="leading-tight">{smoothieItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : plan.id === 'trial_food' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                            <span>5-Day Bowl Menu</span>
                          </div>
                          {BOWL_MENU_5_DAYS.map((bowlItem, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                              <span className="leading-tight">{bowlItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : plan.id === 'pro_food' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-amber-500 shrink-0" />
                              <span>20-Day Pro Bowl Schedule</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">20 Days</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                            {BOWL_PRO_MENU_20_DAYS.map((bowlItem, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                                <span className="leading-tight">{bowlItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : plan.id === 'trial_shakes' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-500 shrink-0" />
                            <span>5-Day Bowl + Shake Combo Menu</span>
                          </div>
                          {COMBO_MENU_5_DAYS.map((comboItem, cIdx) => (
                            <div key={cIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                              <span className="leading-tight">{comboItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : plan.id === 'pro_shakes' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-amber-500 shrink-0" />
                              <span>20-Day Pro Bowl + Shake Schedule</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">20 Days</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                            {COMBO_PRO_MENU_20_DAYS.map((comboItem, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5" />
                                <span className="leading-tight">{comboItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : plan.id === 'trial_smoothies' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-red-500 shrink-0" />
                            <span>5-Day Bowl + Smoothie Combo Menu</span>
                          </div>
                          {BOWL_SMOOTHIE_MENU_5_DAYS.map((bsItem, bsIdx) => (
                            <div key={bsIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                              <span className="leading-tight">{bsItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : plan.id === 'pro_smoothies' ? (
                        <div className="space-y-1.5 bg-neutral-50/90 p-3 rounded-2xl border border-neutral-200/90 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-red-500 shrink-0" />
                              <span>20-Day Pro Bowl + Smoothie Schedule</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">20 Days</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                            {BOWL_SMOOTHIE_PRO_MENU_20_DAYS.map((bsItem, bsIdx) => (
                              <div key={bsIdx} className="flex items-start gap-2 text-xs text-neutral-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                <span className="leading-tight">{bsItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        [
                          `${plan.duration} Days Scheduled Fresh Delivery`,
                          'High-Protein Chef Preparation',
                          'Customize Macros (Veg/Non-Veg/Vegan)',
                          'Freeze / Pause Days via Portal'
                        ].map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                            <CheckCircle2 size={14} className="text-red-600 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Price & Action Section */}
                    <div className="pt-4 border-t border-neutral-200 relative z-10 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black italic text-neutral-950 tracking-tight font-display">
                              ₹{plan.price.toLocaleString()}
                            </span>
                            {meta.originalPrice > plan.price && (
                              <span className="text-xs font-bold text-neutral-400 line-through">
                                ₹{meta.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
                            Only ₹{perDayCost} / day
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg inline-block">
                            Save {Math.round(((meta.originalPrice - plan.price) / meta.originalPrice) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Action CTA Button */}
                      <button
                        id={`btn-select-${plan.id}`}
                        type="button"
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={saving}
                        className={`w-full py-4 px-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md relative overflow-hidden group/btn ${
                          isPro
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/25 hover:shadow-red-600/40'
                            : 'bg-neutral-900 hover:bg-neutral-800 text-white hover:shadow-neutral-900/20'
                        } disabled:opacity-50`}
                      >
                        {isSavingThis ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>ACTIVATING PROTOCOL...</span>
                          </>
                        ) : (
                          <>
                            <span>SELECT & ACTIVATE</span>
                            <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Why Choose Alpino Protocols Grid */}
        <section className="mt-20 p-8 sm:p-12 rounded-[3rem] bg-white border border-neutral-200 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">The Alpino Guarantee</span>
            <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-neutral-950">
              ENGINEERED FOR REAL <span className="text-red-600">BIO-RESULTS</span>
            </h2>
            <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider">
              We eliminate guesswork from athletic performance nutrition with complete kitchen transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                <Fuel size={20} />
              </div>
              <h4 className="text-base font-black uppercase tracking-wider text-neutral-900">High Protein Concentration</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Every meal delivers between 30g and 75g of real protein sourced from antibiotic-free chicken, farm eggs, whey isolate, and organic paneer/tofu.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                <Award size={20} />
              </div>
              <h4 className="text-base font-black uppercase tracking-wider text-neutral-900">Zero Refined Sugars & Oils</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Clean cooking only. No deep frying, no palm oils, and no hidden preservatives. Only extra virgin olive oil, cold-pressed ingredients, and natural spices.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                <Calendar size={20} />
              </div>
              <h4 className="text-base font-black uppercase tracking-wider text-neutral-900">Daily Kitchen Freshness</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Prepared immediately before each delivery slot. We do not store pre-cooked meals or frozen packs—every meal is made fresh to order.
              </p>
            </div>
          </div>
        </section>

        {/* Final Bottom Call to Action */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-neutral-500">
            [ ALL PROTOCOLS BACKED BY ALPINO QUALITY & MACRO INTEGRITY ]
          </p>
        </div>
      </main>
    </div>
  );
}
