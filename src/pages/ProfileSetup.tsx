import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { 
  User, Phone, MapPin, ChevronRight, ChevronLeft, ShieldCheck, Activity, 
  Calendar, Target, Utensils, CheckCircle2, AlertCircle, Sparkles, 
  LayoutList, Layers, ArrowRight, Clock, Dumbbell, Heart, Briefcase, 
  FileCheck, HelpCircle
} from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import { UserProfile } from '../types';
import DynamicLogo from '../components/DynamicLogo';

interface SetupStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const STEPS: SetupStep[] = [
  { id: 'basics', title: 'Personal Info', subtitle: 'Name, contact & profile details', icon: User },
  { id: 'goals', title: 'Fitness Goals', subtitle: 'Target results & weekly activity', icon: Target },
  { id: 'diet', title: 'Dietary & Meals', subtitle: 'Meal choices & allergy notes', icon: Utensils },
  { id: 'logistics', title: 'Delivery & Time', subtitle: 'Address & schedule preferences', icon: MapPin },
  { id: 'extras', title: 'Preferences & Add-ons', subtitle: 'Custom upgrades & agreement', icon: ShieldCheck }
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const OCCUPATION_PRESETS = ['Corporate / Tech', 'Student', 'Fitness / Athlete', 'Business / Founder', 'Healthcare', 'Creative / Design', 'Other'];
const GOAL_OPTIONS = [
  { label: 'Muscle Gain', desc: 'High protein focus to build lean mass' },
  { label: 'Weight Loss', desc: 'Calorie-deficit & nutrient-dense meals' },
  { label: 'Maintenance', desc: 'Balanced macronutrients for vitality' },
  { label: 'Athletic Performance', desc: 'Optimal fuel for sports & heavy training' }
];
const WORKOUT_FREQUENCIES = ['0 - 2 Days', '3 - 4 Days', '5+ Days', 'Daily Grind'];
const MEAL_PREFERENCES = ['Non-Veg', 'Veg', 'Eggetarian', 'Vegan'];
const MEAL_TYPES = ['All Meals (Full Day)', 'Lunch & Dinner', 'Lunch Only', 'Dinner Only'];
const CONSUMPTION_METHODS = ['Delivery', 'Dine-in', 'Takeaway'];
const COMMON_ALLERGIES = ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Soy-Free', 'No Onion/Garlic', 'None'];
const TIME_SLOTS = ['Morning (7:30 - 9:30 AM)', 'Lunch (12:00 - 2:00 PM)', 'Evening (7:00 - 9:00 PM)', 'Flexible'];
const HEARD_SOURCES = ['Instagram', 'Friend / Referral', 'Gym Partner', 'Google Search', 'Walk-In', 'Influencer', 'Other'];
const MEAL_ADDON_OPTIONS = [
  { name: 'Extra Protein Add-on', desc: '+15g pure protein booster' },
  { name: 'Peanut Butter Add-on', desc: '100% natural, sugar-free spread' },
  { name: 'Creatine Monohydrate', desc: 'Pure micronized performance boost' },
  { name: 'Fresh Coconut Water', desc: 'Natural electrolytes for recovery' }
];

export default function ProfileSetup() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Persistent Form State
  const [formData, setFormData] = usePersistedState<Partial<UserProfile>>('setup_form_v4', {
    name: profile?.name || '',
    phone: (profile?.phone && !/^0+$/.test(profile.phone) && profile.phone !== 'Admin') ? profile.phone : '',
    address: (profile?.address && !/^0+$/.test(profile.address) && profile.address !== 'Admin HQ') ? profile.address : '',
    gender: profile?.gender || 'Male',
    occupation: profile?.occupation || 'Corporate / Tech',
    dob: profile?.dob || '',
    primaryGoal: profile?.primaryGoal || 'Muscle Gain',
    workoutFrequency: profile?.workoutFrequency || '3 - 4 Days',
    proteinGoal: profile?.proteinGoal || 80,
    mealPreference: profile?.mealPreference || 'Non-Veg',
    mealTypes: profile?.mealTypes || 'Lunch & Dinner',
    foodAllergies: profile?.foodAllergies || '',
    consumptionMethod: profile?.consumptionMethod || 'Delivery',
    preferredTimeSlot: profile?.preferredTimeSlot || 'Lunch (12:00 - 2:00 PM)',
    startDate: profile?.startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    mealAddons: profile?.mealAddons || [],
    socialMediaFeature: profile?.socialMediaFeature || 'Yes',
    fitnessTips: profile?.fitnessTips || 'Yes',
    heardAboutUs: profile?.heardAboutUs || 'Instagram',
  });

  // UI Modes & States
  const [viewMode, setViewMode] = useState<'stepped' | 'single'>('stepped');
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for auto-scrolling to error in single panel mode
  const singlePanelRef = useRef<HTMLDivElement>(null);

  // Sync profile details if loaded after mount
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.name || '',
        phone: prev.phone || (profile.phone && !/^0+$/.test(profile.phone) && profile.phone !== 'Admin' ? profile.phone : ''),
        address: prev.address || (profile.address && !/^0+$/.test(profile.address) && profile.address !== 'Admin HQ' ? profile.address : ''),
        gender: prev.gender || profile.gender || 'Male',
        occupation: prev.occupation || profile.occupation || 'Corporate / Tech',
        dob: prev.dob || profile.dob || '',
        primaryGoal: prev.primaryGoal || profile.primaryGoal || 'Muscle Gain',
        workoutFrequency: prev.workoutFrequency || profile.workoutFrequency || '3 - 4 Days',
        proteinGoal: prev.proteinGoal || profile.proteinGoal || 80,
        mealPreference: prev.mealPreference || profile.mealPreference || 'Non-Veg',
        mealTypes: prev.mealTypes || profile.mealTypes || 'Lunch & Dinner',
        consumptionMethod: prev.consumptionMethod || profile.consumptionMethod || 'Delivery',
        preferredTimeSlot: prev.preferredTimeSlot || profile.preferredTimeSlot || 'Lunch (12:00 - 2:00 PM)',
        startDate: prev.startDate || profile.startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        heardAboutUs: prev.heardAboutUs || profile.heardAboutUs || 'Instagram',
      }));
    }
  }, [profile]);

  const updateField = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const toggleAllergy = (allergy: string) => {
    const current = formData.foodAllergies ? formData.foodAllergies.split(',').map(s => s.trim()).filter(Boolean) : [];
    let updated: string[];
    if (allergy === 'None') {
      updated = ['None'];
    } else {
      const filtered = current.filter(item => item !== 'None');
      if (filtered.includes(allergy)) {
        updated = filtered.filter(item => item !== allergy);
      } else {
        updated = [...filtered, allergy];
      }
    }
    updateField('foodAllergies', updated.join(', '));
  };

  const toggleAddon = (addonName: string) => {
    const current = formData.mealAddons || [];
    if (current.includes(addonName)) {
      updateField('mealAddons', current.filter(a => a !== addonName));
    } else {
      updateField('mealAddons', [...current, addonName]);
    }
  };

  // Step Validation Logic
  const validateCurrentStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!formData.name?.trim()) {
        errors.name = 'Full Name is required';
      }
      if (!formData.phone?.trim() || formData.phone.trim().length < 6) {
        errors.phone = 'Valid Phone Number is required';
      }
    } else if (stepIndex === 3) {
      if (formData.consumptionMethod === 'Delivery' && (!formData.address?.trim() || formData.address.trim().length < 5)) {
        errors.address = 'Delivery Address is required for meal delivery';
      }
    } else if (stepIndex === 4) {
      if (!termsAccepted) {
        errors.terms = 'Please accept the service agreement to continue';
      }
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  // Full Form Validation Logic (for Single Panel or Complete Submission)
  const validateFullForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Full Name is required';
    }
    if (!formData.phone?.trim() || formData.phone.trim().length < 6) {
      errors.phone = 'Valid Phone Number is required';
    }
    if (formData.consumptionMethod === 'Delivery' && (!formData.address?.trim() || formData.address.trim().length < 5)) {
      errors.address = 'Delivery Address is required for meal delivery';
    }
    if (!termsAccepted) {
      errors.terms = 'Please accept the terms to complete setup';
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleSave();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateFullForm()) {
      return;
    }
    if (!profile) return;
    setSaving(true);
    setErrorMessage(null);

    const path = `users/${profile.uid}`;
    try {
      const allowedKeys = [
        'name', 'phone', 'address', 'gender', 'occupation', 'dob',
        'primaryGoal', 'workoutFrequency', 'mealPreference', 'mealTypes',
        'foodAllergies', 'consumptionMethod', 'preferredTimeSlot', 'upgradeMeals',
        'mealAddons', 'socialMediaFeature', 'fitnessTips', 'heardAboutUs', 'startDate',
        'proteinGoal'
      ];

      const sanitizedData = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) => v !== undefined && allowedKeys.includes(k))
      );

      // Default fallback values if empty
      sanitizedData.primaryGoal = sanitizedData.primaryGoal || 'Muscle Gain';
      sanitizedData.mealPreference = sanitizedData.mealPreference || 'Non-Veg';
      sanitizedData.mealTypes = sanitizedData.mealTypes || 'Lunch & Dinner';
      sanitizedData.consumptionMethod = sanitizedData.consumptionMethod || 'Delivery';
      sanitizedData.gender = sanitizedData.gender || 'Male';
      sanitizedData.occupation = sanitizedData.occupation || 'Corporate / Tech';
      sanitizedData.workoutFrequency = sanitizedData.workoutFrequency || '3 - 4 Days';
      sanitizedData.proteinGoal = Number(sanitizedData.proteinGoal) || 80;

      await updateDoc(doc(db, 'users', profile.uid), {
        ...sanitizedData,
        updatedAt: Timestamp.now()
      });

      // Clear cached draft upon successful setup
      try {
        localStorage.removeItem('setup_form_v4');
      } catch (err) {
        console.warn('Storage cleanup:', err);
      }

      if (profile.planStatus === 'pending') {
        navigate('/payment');
      } else if (profile.planStatus === 'active') {
        navigate('/dashboard');
      } else {
        navigate('/plans');
      }
    } catch (error) {
      console.error('Setup Save Error:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-start p-3 sm:p-6 md:p-10 relative selection:bg-red-600 selection:text-white">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-red-600/15 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-amber-500/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-3xl relative z-10 my-4 sm:my-8">
        
        {/* Top Header Card */}
        <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <DynamicLogo showText={false} size={44} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-red-500/20 text-red-400 font-black tracking-[0.2em] px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase">
                    ALPINO CAFÉ
                  </span>
                  <span className="text-xs text-neutral-400 font-medium hidden sm:inline">Personalized Nutrition</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black italic tracking-wide text-white uppercase mt-0.5">
                  Member Profile Setup
                </h1>
              </div>
            </div>

            {/* View Mode Switcher Toggle: Stepped vs Single Panel */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-2xl border border-neutral-800 self-start sm:self-auto">
              <button
                type="button"
                id="btn-stepped-mode"
                onClick={() => setViewMode('stepped')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'stepped'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Step-by-Step</span>
              </button>
              <button
                type="button"
                id="btn-single-mode"
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'single'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutList size={14} />
                <span>Single Panel Form</span>
              </button>
            </div>
          </div>

          {/* Stepped Progress Bar (Shown in Stepped Mode) */}
          {viewMode === 'stepped' && (
            <div className="mt-6 pt-5 border-t border-neutral-800/80">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = idx === currentStep;
                  const isCompleted = idx < currentStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (idx <= currentStep || validateCurrentStep(currentStep)) {
                          setCurrentStep(idx);
                          setErrorMessage(null);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-white/10 text-white border border-red-500/50'
                          : isCompleted
                          ? 'bg-neutral-800/60 text-emerald-400 border border-emerald-500/30'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-red-600 text-white' : isCompleted ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                      </div>
                      <span className="hidden md:inline">{step.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                  animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner if any error is triggered */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-950/80 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-200 shadow-xl backdrop-blur-md"
            >
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <div className="text-xs sm:text-sm font-medium">
                <span className="font-bold text-red-300">Action Required: </span>
                {errorMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: STEP-BY-STEP FLOW */}
        {/* ========================================================================= */}
        {viewMode === 'stepped' && (
          <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative">
            <div className="mb-6">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-1">
                {React.createElement(STEPS[currentStep].icon, { size: 16 })}
                <span>Step {currentStep + 1} of {STEPS.length}</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase italic">
                {STEPS[currentStep].title}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {STEPS[currentStep].subtitle}
              </p>
            </div>

            <div className="min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Step 0: Personal Info */}
                  {currentStep === 0 && (
                    <div className="space-y-5">
                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                          <input
                            type="text"
                            id="input-name"
                            placeholder="e.g. Alex Henderson"
                            value={formData.name || ''}
                            onChange={(e) => updateField('name', e.target.value)}
                            className={`w-full bg-neutral-950 border ${
                              validationErrors.name ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                            } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600`}
                          />
                        </div>
                        {validationErrors.name && (
                          <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                          <input
                            type="tel"
                            id="input-phone"
                            placeholder="e.g. +91 98765 43210"
                            value={formData.phone || ''}
                            onChange={(e) => updateField('phone', e.target.value)}
                            className={`w-full bg-neutral-950 border ${
                              validationErrors.phone ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                            } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600`}
                          />
                        </div>
                        {validationErrors.phone && (
                          <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.phone}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                            Date of Birth
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input
                              type="date"
                              id="input-dob"
                              value={formData.dob || ''}
                              onChange={(e) => updateField('dob', e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-white focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                            Gender
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {GENDER_OPTIONS.map(gen => (
                              <button
                                key={gen}
                                type="button"
                                onClick={() => updateField('gender', gen)}
                                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all truncate ${
                                  formData.gender === gen
                                    ? 'bg-red-600/20 border-red-500 text-red-400 font-black'
                                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                                }`}
                              >
                                {gen}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                          Occupation / Lifestyle
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {OCCUPATION_PRESETS.map(occ => (
                            <button
                              key={occ}
                              type="button"
                              onClick={() => updateField('occupation', occ)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                formData.occupation === occ
                                  ? 'bg-white text-neutral-950 border-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {occ}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or type custom occupation..."
                          value={formData.occupation || ''}
                          onChange={(e) => updateField('occupation', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none placeholder:text-neutral-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 1: Goals & Activity */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          Primary Fitness Goal <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {GOAL_OPTIONS.map(g => (
                            <button
                              key={g.label}
                              type="button"
                              onClick={() => updateField('primaryGoal', g.label)}
                              className={`p-4 rounded-2xl border text-left transition-all relative ${
                                formData.primaryGoal === g.label
                                  ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-900/20'
                                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-black uppercase tracking-wide ${
                                  formData.primaryGoal === g.label ? 'text-red-400' : 'text-white'
                                }`}>
                                  {g.label}
                                </span>
                                {formData.primaryGoal === g.label && (
                                  <CheckCircle2 size={16} className="text-red-400" />
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-1 font-medium">{g.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          Weekly Workout Routine
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {WORKOUT_FREQUENCIES.map(freq => (
                            <button
                              key={freq}
                              type="button"
                              onClick={() => updateField('workoutFrequency', freq)}
                              className={`py-3.5 px-3 rounded-xl border text-center transition-all ${
                                formData.workoutFrequency === freq
                                  ? 'bg-white text-neutral-950 border-white font-black'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xs font-bold block">{freq}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                            Daily Protein Target
                          </label>
                          <span className="text-sm font-black text-amber-400">{formData.proteinGoal || 80}g / day</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {[50, 75, 100, 125, 150].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => updateField('proteinGoal', amt)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                formData.proteinGoal === amt
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {amt}g
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Dietary & Meals */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          Meal Preference <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {MEAL_PREFERENCES.map(pref => (
                            <button
                              key={pref}
                              type="button"
                              onClick={() => updateField('mealPreference', pref)}
                              className={`py-3.5 px-3 rounded-2xl border text-center transition-all ${
                                formData.mealPreference === pref
                                  ? 'bg-red-600 text-white border-red-500 font-black shadow-lg shadow-red-600/30'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xs font-bold uppercase tracking-wider block">{pref}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          Included Meal Schedule <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {MEAL_TYPES.map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateField('mealTypes', type)}
                              className={`p-3.5 rounded-xl border text-left transition-all ${
                                formData.mealTypes === type
                                  ? 'bg-neutral-800 border-white text-white font-bold'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xs uppercase tracking-wide block">{type}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                          Food Allergies & Intolerances
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {COMMON_ALLERGIES.map(allergy => {
                            const isSelected = formData.foodAllergies?.includes(allergy);
                            return (
                              <button
                                key={allergy}
                                type="button"
                                onClick={() => toggleAllergy(allergy)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {allergy}
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative">
                          <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                          <input
                            type="text"
                            placeholder="Any specific ingredients to avoid? (e.g., mushrooms, shell-fish)"
                            value={formData.foodAllergies || ''}
                            onChange={(e) => updateField('foodAllergies', e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none placeholder:text-neutral-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Delivery & Logistics */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          How will you receive your meals? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {CONSUMPTION_METHODS.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => updateField('consumptionMethod', m)}
                              className={`py-3.5 rounded-2xl border text-center transition-all ${
                                formData.consumptionMethod === m
                                  ? 'bg-red-600 text-white border-red-500 font-black shadow-lg shadow-red-600/30'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xs font-bold uppercase tracking-wider block">{m}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                            {formData.consumptionMethod === 'Delivery' ? 'Delivery Address' : 'Contact / Notes'} 
                            {formData.consumptionMethod === 'Delivery' && <span className="text-red-500"> *</span>}
                          </label>
                          {formData.consumptionMethod !== 'Delivery' && (
                            <span className="text-[10px] text-neutral-500">Dine-in / Takeaway at Alpino Club</span>
                          )}
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 text-neutral-500" size={18} />
                          <textarea
                            id="input-address"
                            rows={3}
                            placeholder={formData.consumptionMethod === 'Delivery' ? "Flat / Office No., Building, Street Name, Landmark & Pincode" : "Optional notes or preferred pickup branch"}
                            value={formData.address || ''}
                            onChange={(e) => updateField('address', e.target.value)}
                            className={`w-full bg-neutral-950 border ${
                              validationErrors.address ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                            } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600 resize-none`}
                          />
                        </div>
                        {validationErrors.address && (
                          <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.address}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                            Preferred Time Slot
                          </label>
                          <select
                            value={formData.preferredTimeSlot || TIME_SLOTS[1]}
                            onChange={(e) => updateField('preferredTimeSlot', e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:outline-none transition-all"
                          >
                            {TIME_SLOTS.map(slot => (
                              <option key={slot} value={slot} className="bg-neutral-900 text-white">
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                            Subscription Start Date
                          </label>
                          <input
                            type="date"
                            value={formData.startDate || ''}
                            onChange={(e) => updateField('startDate', e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Preferences & Agreement */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                          Boost Your Plan (Optional Add-ons)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {MEAL_ADDON_OPTIONS.map(addon => {
                            const isSelected = formData.mealAddons?.includes(addon.name);
                            return (
                              <button
                                key={addon.name}
                                type="button"
                                onClick={() => toggleAddon(addon.name)}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                  isSelected
                                    ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-900/20'
                                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-black uppercase tracking-wider ${
                                    isSelected ? 'text-red-400' : 'text-white'
                                  }`}>
                                    {addon.name}
                                  </span>
                                  {isSelected && <CheckCircle2 size={16} className="text-red-400" />}
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-1">{addon.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">Nutrition & Fitness Coaching</span>
                            <span className="text-[11px] text-neutral-400">Receive weekly meal advice and progress tips</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateField('fitnessTips', formData.fitnessTips === 'Yes' ? 'No' : 'Yes')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              formData.fitnessTips === 'Yes'
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {formData.fitnessTips === 'Yes' ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        <div className="h-px bg-neutral-800/80" />

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">Community Spotlight</span>
                            <span className="text-[11px] text-neutral-400">Share transformation milestones on our wall</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateField('socialMediaFeature', formData.socialMediaFeature === 'Yes' ? 'No' : 'Yes')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              formData.socialMediaFeature === 'Yes'
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {formData.socialMediaFeature === 'Yes' ? 'Yes' : 'No'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                          Where did you discover Alpino?
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {HEARD_SOURCES.map(source => (
                            <button
                              key={source}
                              type="button"
                              onClick={() => updateField('heardAboutUs', source)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                formData.heardAboutUs === source
                                  ? 'bg-white text-neutral-950 border-white font-black'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Terms & Conditions Checkbox */}
                      <div className="pt-2">
                        <label 
                          id="label-terms"
                          className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                            termsAccepted ? 'bg-emerald-950/20 border-emerald-500/40 text-neutral-200' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="checkbox-terms"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (e.target.checked && validationErrors.terms) {
                                setValidationErrors(prev => {
                                  const n = { ...prev };
                                  delete n.terms;
                                  return n;
                                });
                              }
                            }}
                            className="w-5 h-5 rounded mt-0.5 accent-red-600 cursor-pointer shrink-0"
                          />
                          <div className="text-xs leading-relaxed">
                            <span className="font-bold text-white block mb-0.5">I agree to Alpino Member Policies & Delivery Guidelines</span>
                            I confirm that my personal information and dietary preferences provided above are accurate.
                          </div>
                        </label>
                        {validationErrors.terms && (
                          <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.terms}</p>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Stepped Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center gap-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  id="btn-step-back"
                  onClick={handleBack}
                  className="py-4 px-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
              )}
              
              <button
                type="button"
                id="btn-step-next"
                onClick={currentStep === STEPS.length - 1 ? () => handleSave() : handleNext}
                disabled={saving}
                className="flex-1 py-4 sm:py-4.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    SAVING PROFILE...
                  </span>
                ) : currentStep === STEPS.length - 1 ? (
                  <span className="flex items-center gap-2">
                    COMPLETE SETUP <CheckCircle2 size={18} />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    CONTINUE TO {STEPS[currentStep + 1]?.title.toUpperCase()} <ChevronRight size={18} />
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: SINGLE ALL-IN-ONE PANEL (Requested by user) */}
        {/* ========================================================================= */}
        {viewMode === 'single' && (
          <div ref={singlePanelRef} className="space-y-6">
            
            {/* Section 1: Personal Info */}
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">1. Personal Information</h3>
                  <p className="text-xs text-neutral-400">Your core contact and identity details</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                      <input
                        type="text"
                        placeholder="e.g. Alex Henderson"
                        value={formData.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        className={`w-full bg-neutral-950 border ${
                          validationErrors.name ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                        } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600`}
                      />
                    </div>
                    {validationErrors.name && (
                      <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className={`w-full bg-neutral-950 border ${
                          validationErrors.phone ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                        } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600`}
                      />
                    </div>
                    {validationErrors.phone && (
                      <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                      <input
                        type="date"
                        value={formData.dob || ''}
                        onChange={(e) => updateField('dob', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Gender
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDER_OPTIONS.map(gen => (
                        <button
                          key={gen}
                          type="button"
                          onClick={() => updateField('gender', gen)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all truncate ${
                            formData.gender === gen
                              ? 'bg-red-600/20 border-red-500 text-red-400 font-black'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {gen}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                    Occupation / Lifestyle
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {OCCUPATION_PRESETS.map(occ => (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => updateField('occupation', occ)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          formData.occupation === occ
                            ? 'bg-white text-neutral-950 border-white'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {occ}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Fitness Goals */}
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">2. Fitness Goals & Activity</h3>
                  <p className="text-xs text-neutral-400">Customizes calorie and macro calculations</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                    Primary Fitness Goal <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOAL_OPTIONS.map(g => (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => updateField('primaryGoal', g.label)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          formData.primaryGoal === g.label
                            ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-900/20'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black uppercase tracking-wide ${
                            formData.primaryGoal === g.label ? 'text-red-400' : 'text-white'
                          }`}>
                            {g.label}
                          </span>
                          {formData.primaryGoal === g.label && (
                            <CheckCircle2 size={16} className="text-red-400" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 font-medium">{g.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Weekly Workout Routine
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {WORKOUT_FREQUENCIES.map(freq => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => updateField('workoutFrequency', freq)}
                          className={`py-3 px-2 rounded-xl border text-center transition-all ${
                            formData.workoutFrequency === freq
                              ? 'bg-white text-neutral-950 border-white font-black'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold block">{freq}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                        Daily Protein Target
                      </label>
                      <span className="text-xs font-black text-amber-400">{formData.proteinGoal || 80}g / day</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[50, 75, 100, 125, 150].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => updateField('proteinGoal', amt)}
                          className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                            formData.proteinGoal === amt
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {amt}g
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Dietary & Meals */}
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Utensils size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">3. Dietary Preferences</h3>
                  <p className="text-xs text-neutral-400">Food preparation and dietary restrictions</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                    Dietary Choice <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MEAL_PREFERENCES.map(pref => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => updateField('mealPreference', pref)}
                        className={`py-3.5 px-3 rounded-2xl border text-center transition-all ${
                          formData.mealPreference === pref
                            ? 'bg-red-600 text-white border-red-500 font-black shadow-lg shadow-red-600/30'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider block">{pref}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                    Meal Schedule <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MEAL_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('mealTypes', type)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          formData.mealTypes === type
                            ? 'bg-neutral-800 border-white text-white font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wide block">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                    Allergies & Custom Instructions
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COMMON_ALLERGIES.map(allergy => {
                      const isSelected = formData.foodAllergies?.includes(allergy);
                      return (
                        <button
                          key={allergy}
                          type="button"
                          onClick={() => toggleAllergy(allergy)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {allergy}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    placeholder="Specific food dislikes or allergy details..."
                    value={formData.foodAllergies || ''}
                    onChange={(e) => updateField('foodAllergies', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl py-3 px-4 text-xs text-white focus:outline-none placeholder:text-neutral-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Logistics & Delivery */}
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">4. Delivery & Logistics</h3>
                  <p className="text-xs text-neutral-400">Where and when to deliver your fresh meals</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                    Consumption Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {CONSUMPTION_METHODS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateField('consumptionMethod', m)}
                        className={`py-3.5 rounded-2xl border text-center transition-all ${
                          formData.consumptionMethod === m
                            ? 'bg-red-600 text-white border-red-500 font-black shadow-lg shadow-red-600/30'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider block">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                    Delivery Address {formData.consumptionMethod === 'Delivery' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-neutral-500" size={18} />
                    <textarea
                      rows={3}
                      placeholder={formData.consumptionMethod === 'Delivery' ? "Flat / Office No., Building, Street Name, Landmark & Pincode" : "Optional notes or pickup location"}
                      value={formData.address || ''}
                      onChange={(e) => updateField('address', e.target.value)}
                      className={`w-full bg-neutral-950 border ${
                        validationErrors.address ? 'border-red-500 bg-red-950/20' : 'border-neutral-800 focus:border-red-500'
                      } rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-neutral-600 resize-none`}
                    />
                  </div>
                  {validationErrors.address && (
                    <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Preferred Time Slot
                    </label>
                    <select
                      value={formData.preferredTimeSlot || TIME_SLOTS[1]}
                      onChange={(e) => updateField('preferredTimeSlot', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:outline-none transition-all"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot} className="bg-neutral-900 text-white">
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                      Subscription Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Preferences & Agreement */}
            <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">5. Upgrades & Final Agreement</h3>
                  <p className="text-xs text-neutral-400">Customize add-ons and complete verification</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-3">
                    Plan Add-ons
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MEAL_ADDON_OPTIONS.map(addon => {
                      const isSelected = formData.mealAddons?.includes(addon.name);
                      return (
                        <button
                          key={addon.name}
                          type="button"
                          onClick={() => toggleAddon(addon.name)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-900/20'
                              : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black uppercase tracking-wider ${
                              isSelected ? 'text-red-400' : 'text-white'
                            }`}>
                              {addon.name}
                            </span>
                            {isSelected && <CheckCircle2 size={16} className="text-red-400" />}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1">{addon.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">
                    Where did you discover Alpino?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HEARD_SOURCES.map(source => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => updateField('heardAboutUs', source)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          formData.heardAboutUs === source
                            ? 'bg-white text-neutral-950 border-white font-black'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-2">
                  <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    termsAccepted ? 'bg-emerald-950/20 border-emerald-500/40 text-neutral-200' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (e.target.checked && validationErrors.terms) {
                          setValidationErrors(prev => {
                            const n = { ...prev };
                            delete n.terms;
                            return n;
                          });
                        }
                      }}
                      className="w-5 h-5 rounded mt-0.5 accent-red-600 cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed">
                      <span className="font-bold text-white block mb-0.5">I agree to Alpino Member Policies & Delivery Guidelines</span>
                      I confirm that my personal details and dietary preferences are correct.
                    </div>
                  </label>
                  {validationErrors.terms && (
                    <p className="text-[11px] text-red-400 font-medium mt-1.5 pl-2">{validationErrors.terms}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky/Floating Bottom Save Button in Single Panel Mode */}
            <div className="sticky bottom-4 z-20 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <span className="text-xs text-neutral-400 font-bold block">Ready to start?</span>
                <span className="text-[11px] text-neutral-500">Save preferences & proceed to plan selection</span>
              </div>
              <button
                type="button"
                id="btn-single-save"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex-1 sm:flex-initial sm:px-10 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    SAVING PROFILE...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    COMPLETE ALL SETUP <CheckCircle2 size={18} />
                  </span>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

