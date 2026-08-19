import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Activity, 
  Calendar, 
  Target, 
  Utensils, 
  CheckCircle2, 
  Briefcase, 
  AlertCircle,
  Clock,
  Sparkles,
  ListOrdered,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import { UserProfile } from '../types';
import DynamicLogo from '../components/DynamicLogo';

const STEPS = [
  { id: 'basics', title: 'Personal Info', shortTitle: 'Profile', icon: User },
  { id: 'goals', title: 'Your Goals', shortTitle: 'Goals', icon: Target },
  { id: 'diet', title: 'Dietary', shortTitle: 'Diet', icon: Utensils },
  { id: 'logistics', title: 'Logistics', shortTitle: 'Delivery', icon: MapPin },
  { id: 'extras', title: 'Preferences', shortTitle: 'Review', icon: ShieldCheck }
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const OCCUPATION_OPTIONS = ['Student', 'Software / Tech', 'Corporate / Professional', 'Fitness / Athlete', 'Business', 'Other'];
const GOAL_OPTIONS = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Athletic Performance'];
const FREQUENCY_OPTIONS = ['0-2 days', '3-4 days', '5+ days'];
const MEAL_PREF_OPTIONS = ['Veg', 'Non-Veg', 'Eggetarian', 'Vegan'];
const MEAL_TYPE_OPTIONS = ['All Meals', 'Lunch & Dinner', 'Lunch Only', 'Dinner Only'];
const CONSUMPTION_OPTIONS = ['Delivery', 'Takeaway', 'Dine-in'];
const TIME_SLOT_OPTIONS = [
  'Lunch (12:30 PM - 2:00 PM)',
  'Dinner (7:30 PM - 9:30 PM)',
  'Lunch & Dinner (Both)',
  'Morning / Breakfast (8:00 AM - 10:00 AM)'
];
const HEARD_ABOUT_OPTIONS = ['Instagram', 'Gym Partnership', 'Friend Referral', 'Google', 'Walk-In', 'Influencer', 'Other'];
const ADDON_OPTIONS = ['Extra Protein Add-on', 'Peanut Butter Add-on', 'Creatine Add-on', 'Coconut Water Add-on'];

// Helper to get tomorrow formatted YYYY-MM-DD
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export default function ProfileSetup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = usePersistedState<Partial<UserProfile>>('setup_form_v4', {
    name: profile?.name || user?.displayName || '',
    phone: (profile?.phone && /^0+$/.test(profile.phone)) ? '' : (profile?.phone || ''),
    address: (profile?.address && /^0+$/.test(profile.address)) ? '' : (profile?.address || ''),
    gender: profile?.gender || 'Male',
    occupation: profile?.occupation || 'Corporate / Professional',
    primaryGoal: profile?.primaryGoal || 'Muscle Gain',
    workoutFrequency: profile?.workoutFrequency || '3-4 days',
    mealPreference: profile?.mealPreference || 'Non-Veg',
    mealTypes: profile?.mealTypes || 'Lunch & Dinner',
    foodAllergies: profile?.foodAllergies || 'None',
    consumptionMethod: profile?.consumptionMethod || 'Delivery',
    preferredTimeSlot: profile?.preferredTimeSlot || 'Lunch (12:30 PM - 2:00 PM)',
    upgradeMeals: profile?.upgradeMeals || 'No',
    socialMediaFeature: profile?.socialMediaFeature || 'Yes',
    fitnessTips: profile?.fitnessTips || 'Yes',
    heardAboutUs: profile?.heardAboutUs || 'Instagram',
    dob: profile?.dob || '2000-01-01',
    mealAddons: profile?.mealAddons || [],
    startDate: profile?.startDate || getTomorrowDate(),
  });

  const [saving, setSaving] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'step' | 'all'>('step');

  // Sync initial fields if profile updates
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.name || user?.displayName || '',
        phone: prev.phone || ((profile.phone && !/^0+$/.test(profile.phone)) ? profile.phone : ''),
        address: prev.address || ((profile.address && !/^0+$/.test(profile.address)) ? profile.address : ''),
        gender: prev.gender || profile.gender || 'Male',
        occupation: prev.occupation || profile.occupation || 'Corporate / Professional',
        primaryGoal: prev.primaryGoal || profile.primaryGoal || 'Muscle Gain',
        workoutFrequency: prev.workoutFrequency || profile.workoutFrequency || '3-4 days',
        mealPreference: prev.mealPreference || profile.mealPreference || 'Non-Veg',
        mealTypes: prev.mealTypes || profile.mealTypes || 'Lunch & Dinner',
        foodAllergies: prev.foodAllergies || profile.foodAllergies || 'None',
        consumptionMethod: prev.consumptionMethod || profile.consumptionMethod || 'Delivery',
        preferredTimeSlot: prev.preferredTimeSlot || profile.preferredTimeSlot || 'Lunch (12:30 PM - 2:00 PM)',
        upgradeMeals: prev.upgradeMeals || profile.upgradeMeals || 'No',
        socialMediaFeature: prev.socialMediaFeature || profile.socialMediaFeature || 'Yes',
        fitnessTips: prev.fitnessTips || profile.fitnessTips || 'Yes',
        heardAboutUs: prev.heardAboutUs || profile.heardAboutUs || 'Instagram',
        dob: prev.dob || profile.dob || '2000-01-01',
        mealAddons: prev.mealAddons?.length ? prev.mealAddons : (profile.mealAddons || []),
        startDate: prev.startDate || profile.startDate || getTomorrowDate(),
      }));
    }
  }, [profile, user]);

  const updateField = (field: keyof UserProfile, value: any) => {
    setErrorMessage(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Step Validation logic
  const checkStepValidation = (step: number): { valid: boolean; error?: string } => {
    switch (step) {
      case 0:
        if (!formData.name?.trim()) return { valid: false, error: 'Please enter your Full Name' };
        if (!formData.phone?.trim()) return { valid: false, error: 'Please enter your Phone Number' };
        if (!formData.dob) return { valid: false, error: 'Please enter your Date of Birth' };
        if (!formData.gender) return { valid: false, error: 'Please select your Gender' };
        if (!formData.occupation) return { valid: false, error: 'Please select or enter your Occupation' };
        return { valid: true };
      case 1:
        if (!formData.primaryGoal) return { valid: false, error: 'Please select your Primary Goal' };
        if (!formData.workoutFrequency) return { valid: false, error: 'Please select your Workout Frequency' };
        return { valid: true };
      case 2:
        if (!formData.mealPreference) return { valid: false, error: 'Please choose your Meal Preference' };
        if (!formData.mealTypes) return { valid: false, error: 'Please select included Meal Types' };
        return { valid: true };
      case 3:
        if (!formData.consumptionMethod) return { valid: false, error: 'Please choose Dine-in, Takeaway, or Delivery' };
        if (formData.consumptionMethod === 'Delivery' && !formData.address?.trim()) {
          return { valid: false, error: 'Please enter your Delivery Address' };
        }
        if (!formData.preferredTimeSlot) return { valid: false, error: 'Please select a preferred Time Slot' };
        if (!formData.startDate) return { valid: false, error: 'Please choose a Plan Start Date' };
        return { valid: true };
      case 4:
        if (!formData.heardAboutUs) return { valid: false, error: 'Please select where you heard about us' };
        if (!termsAccepted) return { valid: false, error: 'Please agree to the terms to finish setup' };
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  const handleNext = () => {
    const result = checkStepValidation(currentStep);
    if (result.valid) {
      setErrorMessage(null);
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      setErrorMessage(result.error || 'Please fill in all required fields to continue.');
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const jumpToStep = (index: number) => {
    setErrorMessage(null);
    setCurrentStep(index);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Verify all steps before final save
    for (let i = 0; i < STEPS.length; i++) {
      const stepCheck = checkStepValidation(i);
      if (!stepCheck.valid) {
        setErrorMessage(`Step ${i + 1} (${STEPS[i].title}): ${stepCheck.error}`);
        setCurrentStep(i);
        return;
      }
    }

    if (!user) {
      navigate('/login');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    
    const path = `users/${user.uid}`;
    try {
      const allowedKeys = [
        'name', 'phone', 'address', 'gender', 'occupation', 'primaryGoal', 'workoutFrequency', 
        'mealPreference', 'mealTypes', 'foodAllergies', 'consumptionMethod', 'preferredTimeSlot', 
        'upgradeMeals', 'socialMediaFeature', 'fitnessTips', 'heardAboutUs', 'startDate', 'dob', 'mealAddons'
      ];
      
      const payload: Record<string, any> = {
        ...Object.fromEntries(
          Object.entries(formData).filter(([k, v]) => v !== undefined && allowedKeys.includes(k))
        ),
        // Fallback default address if dine-in
        address: formData.consumptionMethod === 'Dine-in' ? (formData.address || 'Dine-in at Alpino Kitchen') : (formData.address || 'Address provided on call'),
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'users', user.uid), payload);

      if (profile?.planStatus === 'pending' || profile?.planStatus === 'rejected') {
        navigate('/payment');
      } else if (profile?.planStatus === 'active') {
        navigate('/dashboard');
      } else {
        navigate('/plans');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      setErrorMessage('Failed to save profile. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="profile-setup-root" className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative selection:bg-red-600 selection:text-white">
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-red-950/20 rounded-full blur-[160px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl bg-neutral-900/90 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-red-600/10 border border-red-500/30 rounded-2xl">
              <DynamicLogo showText={false} size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-500 font-black uppercase tracking-[0.25em]">Alpino Nutrition</span>
                <span className="text-neutral-500 text-[10px]">•</span>
                <span className="text-neutral-400 text-[10px] font-bold tracking-widest uppercase">Profile Onboarding</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                {viewMode === 'step' ? STEPS[currentStep].title : 'Complete Setup Panel'}
              </h1>
            </div>
          </div>

          {/* Toggle Single Panel vs Stepped View */}
          <div className="flex items-center gap-2 bg-neutral-950/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              id="btn-mode-stepped"
              onClick={() => setViewMode('step')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'step' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListOrdered size={13} />
              <span>Step-by-Step</span>
            </button>
            <button
              type="button"
              id="btn-mode-all"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'all' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>All Fields</span>
            </button>
          </div>
        </div>

        {/* Step Navigation Tabs (Clickable anytime) */}
        {viewMode === 'step' && (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-8">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isPassed = idx < currentStep;
              return (
                <button
                  key={step.id}
                  id={`step-tab-${step.id}`}
                  type="button"
                  onClick={() => jumpToStep(idx)}
                  className={`group relative flex flex-col items-center py-2.5 sm:py-3 px-1 rounded-2xl border transition-all text-center ${
                    isActive 
                      ? 'bg-red-600/15 border-red-500 text-red-400 shadow-md shadow-red-950/50' 
                      : isPassed
                      ? 'bg-neutral-800/40 border-neutral-700/60 text-neutral-300 hover:border-neutral-500'
                      : 'bg-neutral-950/30 border-white/5 text-neutral-500 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Icon size={16} className={`transition-colors ${isActive ? 'text-red-500' : isPassed ? 'text-neutral-300' : 'text-neutral-500'}`} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider line-clamp-1 truncate w-full px-1">
                    {step.shortTitle}
                  </span>
                  <div 
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
                      isActive ? 'w-8 bg-red-500' : isPassed ? 'w-4 bg-neutral-400' : 'w-0'
                    }`} 
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Error Notification Banner */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 flex items-center gap-3 text-xs font-bold tracking-wide"
          >
            <AlertCircle className="text-red-400 shrink-0" size={18} />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-neutral-400 hover:text-white text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* FORM CONTENT */}
        <div className="min-h-[380px]">
          {viewMode === 'step' ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-6"
              >
                {/* STEP 0: Personal Info */}
                {currentStep === 0 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          <User size={13} className="text-red-500" /> Full Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                          id="setup-input-name"
                          type="text" 
                          placeholder="E.G. ALEX JOHNSON"
                          value={formData.name || ''}
                          onChange={(e) => updateField('name', e.target.value)}
                          className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-sm uppercase tracking-wider text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-600"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          <Phone size={13} className="text-red-500" /> Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input 
                          id="setup-input-phone"
                          type="tel" 
                          placeholder="E.G. +91 98765 43210"
                          value={formData.phone || ''}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-sm uppercase tracking-wider text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date of Birth */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-red-500" /> Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input 
                          id="setup-input-dob"
                          type="date" 
                          value={formData.dob || '2000-01-01'}
                          onChange={(e) => updateField('dob', e.target.value)}
                          className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-sm uppercase tracking-wider text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-neutral-200"
                        />
                      </div>

                      {/* Gender Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {GENDER_OPTIONS.map(g => (
                            <button
                              key={g}
                              id={`gender-opt-${g.toLowerCase()}`}
                              type="button"
                              onClick={() => updateField('gender', g)}
                              className={`py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                formData.gender === g 
                                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40' 
                                  : 'bg-neutral-950/80 border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Occupation */}
                    <div className="space-y-2 p-4 rounded-2xl bg-neutral-950/50 border border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                        <Briefcase size={13} className="text-red-500" /> Occupation / Routine <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {OCCUPATION_OPTIONS.map(occ => (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => updateField('occupation', occ)}
                            className={`py-2 px-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                              formData.occupation === occ
                                ? 'bg-red-600 border-red-500 text-white'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {occ}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: Your Goals */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        <Target size={14} className="text-red-500" /> Primary Fitness Goal <span className="text-red-500">*</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {GOAL_OPTIONS.map(goal => (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => updateField('primaryGoal', goal)}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                              formData.primaryGoal === goal
                                ? 'bg-red-600/20 border-red-500 text-white shadow-lg'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-black uppercase tracking-wider">{goal}</span>
                            {formData.primaryGoal === goal && <CheckCircle2 size={16} className="text-red-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        <Activity size={14} className="text-red-500" /> Workout Frequency (Weekly) <span className="text-red-500">*</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {FREQUENCY_OPTIONS.map(freq => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => updateField('workoutFrequency', freq)}
                            className={`py-3.5 rounded-2xl border text-center transition-all ${
                              formData.workoutFrequency === freq
                                ? 'bg-red-600 border-red-500 text-white font-black shadow-lg'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 font-bold hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="text-[10px] sm:text-xs uppercase tracking-wider">{freq}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Dietary */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        <Utensils size={14} className="text-red-500" /> Meal Preference <span className="text-red-500">*</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MEAL_PREF_OPTIONS.map(pref => (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => updateField('mealPreference', pref)}
                            className={`py-3.5 px-3 rounded-2xl border text-center transition-all ${
                              formData.mealPreference === pref
                                ? 'bg-red-600 border-red-500 text-white font-black'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 font-bold hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="text-xs uppercase tracking-wider">{pref}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        <Clock size={14} className="text-red-500" /> Meal Types Included <span className="text-red-500">*</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {MEAL_TYPE_OPTIONS.map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateField('mealTypes', type)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                              formData.mealTypes === type
                                ? 'bg-red-600/20 border-red-500 text-white font-black'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 font-bold hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="text-xs uppercase tracking-wider">{type}</span>
                            {formData.mealTypes === type && <CheckCircle2 size={16} className="text-red-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Food Allergies */}
                    <div className="space-y-2 p-4 rounded-2xl bg-neutral-950/50 border border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1">
                        Any Food Allergies or Restrictions? (Optional)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['None', 'Peanuts', 'Lactose', 'Gluten', 'Eggs', 'Soy', 'Seafood'].map(allergen => (
                          <button
                            key={allergen}
                            type="button"
                            onClick={() => {
                              if (allergen === 'None') {
                                updateField('foodAllergies', 'None');
                              } else {
                                const curr = formData.foodAllergies && formData.foodAllergies !== 'None' ? formData.foodAllergies : '';
                                if (!curr.includes(allergen)) {
                                  updateField('foodAllergies', curr ? `${curr}, ${allergen}` : allergen);
                                }
                              }
                            }}
                            className="py-1 px-3 rounded-lg border border-white/10 bg-neutral-900 text-neutral-400 hover:text-white text-[10px] font-bold uppercase tracking-wider"
                          >
                            +{allergen}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="text" 
                        placeholder="E.G. NO DAIRY, NO SEAFOOD (OR NONE)"
                        value={formData.foodAllergies || ''}
                        onChange={(e) => updateField('foodAllergies', e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl py-3 px-4 font-bold text-xs uppercase tracking-wider text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Logistics */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    {/* Consumption Mode */}
                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        <MapPin size={14} className="text-red-500" /> How will you consume your meals? <span className="text-red-500">*</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {CONSUMPTION_OPTIONS.map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => updateField('consumptionMethod', method)}
                            className={`py-3.5 rounded-2xl border text-center transition-all ${
                              formData.consumptionMethod === method
                                ? 'bg-red-600 border-red-500 text-white font-black shadow-lg'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 font-bold hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="text-xs uppercase tracking-wider">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                        <MapPin size={13} className="text-red-500" /> Delivery Address / Location Notes {formData.consumptionMethod === 'Delivery' && <span className="text-red-500">*</span>}
                      </label>
                      <textarea 
                        rows={2}
                        placeholder={formData.consumptionMethod === 'Delivery' ? "ENTER YOUR COMPLETE APARTMENT / STREET / PINCODE" : "OPTIONAL NOTES FOR DINE-IN / TAKEAWAY"}
                        value={formData.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-sm uppercase tracking-wider text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-neutral-600 resize-none"
                      />
                    </div>

                    {/* Time Slot & Start Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          <Clock size={13} className="text-red-500" /> Preferred Delivery Slot <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.preferredTimeSlot || TIME_SLOT_OPTIONS[0]}
                          onChange={(e) => updateField('preferredTimeSlot', e.target.value)}
                          className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white focus:outline-none focus:border-red-500 transition-all"
                        >
                          {TIME_SLOT_OPTIONS.map(slot => (
                            <option key={slot} value={slot} className="bg-neutral-900 text-white">
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 pl-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-red-500" /> Plan Start Date <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="date"
                          value={formData.startDate || getTomorrowDate()}
                          onChange={(e) => updateField('startDate', e.target.value)}
                          className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white focus:outline-none focus:border-red-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Preferences & Confirmation */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    {/* Add-ons */}
                    <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-red-500" /> Upgrade Add-ons (Optional)
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Select any</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ADDON_OPTIONS.map(addon => {
                          const isSelected = formData.mealAddons?.includes(addon);
                          return (
                            <button 
                              key={addon} 
                              type="button" 
                              onClick={() => {
                                const current = formData.mealAddons || [];
                                if (isSelected) {
                                  updateField('mealAddons', current.filter(a => a !== addon));
                                } else {
                                  updateField('mealAddons', [...current, addon]);
                                }
                              }} 
                              className={`p-3.5 rounded-2xl text-left text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-red-600/20 border-red-500 text-white' 
                                  : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <span>{addon}</span>
                              {isSelected && <CheckCircle2 size={16} className="text-red-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preferences Yes/No row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-neutral-950/50 border border-white/5 flex flex-col justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Feature in transformation stories?</span>
                        <div className="flex gap-2">
                          {['Yes', 'No'].map(ans => (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => updateField('socialMediaFeature', ans)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                formData.socialMediaFeature === ans
                                  ? 'bg-red-600 border-red-500 text-white'
                                  : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {ans}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-950/50 border border-white/5 flex flex-col justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Fitness & Nutrition guidance tips?</span>
                        <div className="flex gap-2">
                          {['Yes', 'No'].map(ans => (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => updateField('fitnessTips', ans)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                formData.fitnessTips === ans
                                  ? 'bg-red-600 border-red-500 text-white'
                                  : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {ans}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Where did you hear about us? */}
                    <div className="p-4 rounded-2xl bg-neutral-950/50 border border-white/5 space-y-2.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block">Where did you hear about us? <span className="text-red-500">*</span></span>
                      <div className="flex flex-wrap gap-2">
                        {HEARD_ABOUT_OPTIONS.map(source => (
                          <button 
                            key={source} 
                            type="button" 
                            onClick={() => updateField('heardAboutUs', source)} 
                            className={`py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                              formData.heardAboutUs === source 
                                ? 'bg-red-600 border-red-500 text-white' 
                                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {source}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Terms Agreement Toggle */}
                    <div 
                      onClick={() => setTermsAccepted(!termsAccepted)}
                      className="p-4 rounded-2xl bg-red-950/30 border border-red-500/20 flex items-center gap-3 cursor-pointer hover:bg-red-950/40 transition-all select-none"
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        termsAccepted ? 'bg-red-600 border-red-500 text-white' : 'border-neutral-500 bg-neutral-900'
                      }`}>
                        {termsAccepted && <CheckCircle2 size={14} />}
                      </div>
                      <div className="text-xs text-neutral-300 font-medium">
                        I confirm that the details provided are accurate and agree to Alpino Meal Plan Terms & Guidelines.
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            /* ALL-IN-ONE VIEW (SINGLE PANEL) */
            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Section 1 */}
              <div className="space-y-4 p-5 rounded-2xl bg-neutral-950/60 border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <User size={14} /> 1. Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Full Name *</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => updateField('name', e.target.value)} 
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Phone Number *</label>
                    <input 
                      type="tel" 
                      value={formData.phone || ''} 
                      onChange={e => updateField('phone', e.target.value)} 
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Date of Birth *</label>
                    <input 
                      type="date" 
                      value={formData.dob || '2000-01-01'} 
                      onChange={e => updateField('dob', e.target.value)} 
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Gender *</label>
                    <div className="grid grid-cols-3 gap-1">
                      {GENDER_OPTIONS.map(g => (
                        <button 
                          key={g} 
                          type="button" 
                          onClick={() => updateField('gender', g)} 
                          className={`py-2 rounded-xl text-[11px] font-bold uppercase border ${formData.gender === g ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4 p-5 rounded-2xl bg-neutral-950/60 border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <Target size={14} /> 2. Fitness Goals & Activity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-2">Primary Goal *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GOAL_OPTIONS.map(goal => (
                        <button key={goal} type="button" onClick={() => updateField('primaryGoal', goal)} className={`p-2.5 rounded-xl text-[10px] font-bold uppercase border ${formData.primaryGoal === goal ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-2">Workout Frequency *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FREQUENCY_OPTIONS.map(freq => (
                        <button key={freq} type="button" onClick={() => updateField('workoutFrequency', freq)} className={`p-2.5 rounded-xl text-[10px] font-bold uppercase border ${formData.workoutFrequency === freq ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-4 p-5 rounded-2xl bg-neutral-950/60 border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <Utensils size={14} /> 3. Nutrition & Dietary Preferences
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-2">Meal Preference *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MEAL_PREF_OPTIONS.map(p => (
                        <button key={p} type="button" onClick={() => updateField('mealPreference', p)} className={`p-2.5 rounded-xl text-[10px] font-bold uppercase border ${formData.mealPreference === p ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-2">Meal Types Included *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MEAL_TYPE_OPTIONS.map(t => (
                        <button key={t} type="button" onClick={() => updateField('mealTypes', t)} className={`p-2.5 rounded-xl text-[10px] font-bold uppercase border ${formData.mealTypes === t ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Food Allergies / Notes</label>
                  <input type="text" value={formData.foodAllergies || ''} onChange={e => updateField('foodAllergies', e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold" placeholder="None or specify" />
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-4 p-5 rounded-2xl bg-neutral-950/60 border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <MapPin size={14} /> 4. Delivery & Logistics
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {CONSUMPTION_OPTIONS.map(m => (
                    <button key={m} type="button" onClick={() => updateField('consumptionMethod', m)} className={`p-2.5 rounded-xl text-[10px] font-bold uppercase border ${formData.consumptionMethod === m ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Address *</label>
                  <textarea rows={2} value={formData.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold resize-none" placeholder="Delivery street address & landmark" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Time Slot *</label>
                    <select value={formData.preferredTimeSlot || TIME_SLOT_OPTIONS[0]} onChange={e => updateField('preferredTimeSlot', e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold">
                      {TIME_SLOT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Start Date *</label>
                    <input type="date" value={formData.startDate || getTomorrowDate()} onChange={e => updateField('startDate', e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs uppercase text-white font-bold" />
                  </div>
                </div>
              </div>

              {/* Section 5 */}
              <div className="space-y-4 p-5 rounded-2xl bg-neutral-950/60 border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <ShieldCheck size={14} /> 5. Final Confirmation
                </h3>
                <div className="flex flex-wrap gap-2">
                  {HEARD_ABOUT_OPTIONS.map(source => (
                    <button key={source} type="button" onClick={() => updateField('heardAboutUs', source)} className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase border ${formData.heardAboutUs === source ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-900 text-neutral-400 border-white/10'}`}>
                      {source}
                    </button>
                  ))}
                </div>
                <div 
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center gap-3 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${termsAccepted ? 'bg-red-600 border-red-500 text-white' : 'border-neutral-500'}`}>
                    {termsAccepted && <CheckCircle2 size={12} />}
                  </div>
                  <span className="text-xs text-neutral-300">I agree to the Alpino Meal Plan Terms & Guidelines.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          {viewMode === 'step' && currentStep > 0 && (
            <button
              type="button"
              id="btn-step-back"
              onClick={handleBack}
              className="py-4 px-6 rounded-2xl bg-neutral-950 border border-white/10 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>
          )}

          {viewMode === 'step' && currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              id="btn-step-next"
              onClick={handleNext}
              className="flex-1 py-4 md:py-4.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
            >
              <span>Continue to {STEPS[currentStep + 1].shortTitle}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              id="btn-step-complete"
              onClick={() => handleSave()}
              disabled={saving}
              className="flex-1 py-4 md:py-4.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(220,38,38,0.4)] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>SAVING PROFILE...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>COMPLETE PROFILE SETUP</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
