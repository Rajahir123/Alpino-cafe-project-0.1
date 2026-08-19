import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Check, ShieldCheck, Calendar, Phone, Mail, MapPin, Target, Utensils, Zap, Clock } from 'lucide-react';
import { PLANS } from '../constants';
import { UserProfile, UserRole, PlanStatus } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (newUser: UserProfile) => void;
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [planId, setPlanId] = useState(PLANS[0].id);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('active');
  const [daysRemaining, setDaysRemaining] = useState(30);
  const [gender, setGender] = useState('Male');
  const [occupation, setOccupation] = useState('');
  const [dob, setDob] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('Muscle Building');
  const [workoutFrequency, setWorkoutFrequency] = useState('4-5 Days/Week');
  const [mealPreference, setMealPreference] = useState('High Protein Non-Veg');
  const [mealTypes, setMealTypes] = useState('Lunch & Dinner');
  const [foodAllergies, setFoodAllergies] = useState('None');
  const [consumptionMethod, setConsumptionMethod] = useState('Delivery');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('1:00 PM - 2:00 PM');
  const [proteinGoal, setProteinGoal] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    const plan = PLANS.find(p => p.id === newPlanId);
    if (plan) {
      setDaysRemaining(plan.duration);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide at least a full name and email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate unique user ID
      const sanitizedEmail = email.trim().toLowerCase();
      const generatedUid = `usr_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
      const selectedPlan = PLANS.find(p => p.id === planId) || PLANS[0];

      const newProfile: UserProfile = {
        uid: generatedUid,
        name: name.trim(),
        email: sanitizedEmail,
        phone: phone.trim(),
        address: address.trim(),
        gender,
        occupation: occupation.trim(),
        dob: dob.trim(),
        primaryGoal,
        workoutFrequency,
        mealPreference,
        mealTypes,
        foodAllergies: foodAllergies.trim() || 'None',
        consumptionMethod,
        preferredTimeSlot,
        role,
        planId: planStatus !== 'none' ? planId : '',
        planStatus,
        daysRemaining: planStatus === 'active' ? Number(daysRemaining) || selectedPlan.duration : 0,
        startDate: new Date().toISOString().split('T')[0],
        proteinGoal: Number(proteinGoal) || 120,
        avgProtein: Number(proteinGoal) || 120,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // 1. Create User Document in Firestore
      const userRef = doc(db, 'users', generatedUid);
      await setDoc(userRef, newProfile);

      // 2. If plan is active or pending, create corresponding payment record
      if (planStatus === 'active' || planStatus === 'pending') {
        const paymentId = `pay_${generatedUid}_${Date.now()}`;
        const payRef = doc(db, 'payments', paymentId);
        await setDoc(payRef, {
          id: paymentId,
          userId: generatedUid,
          userName: name.trim(),
          userEmail: sanitizedEmail,
          userPhone: phone.trim(),
          userAddress: address.trim(),
          planId: planId,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          status: planStatus === 'active' ? 'approved' : 'submitted',
          transactionId: planStatus === 'active' ? 'ADMIN_DIRECT_ONBOARD' : 'PENDING_VERIFY',
          screenshotUrl: 'https://via.placeholder.com/400?text=Admin+Manual+Enrollment',
          verifiedBy: 'System Admin',
          verifiedAt: planStatus === 'active' ? Timestamp.now() : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      onUserAdded(newProfile);
      onClose();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      handleFirestoreError(err, OperationType.CREATE, 'users');
      setError(err.message || 'Failed to save new user to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-neutral-200 rounded-[2rem] max-w-3xl w-full p-6 md:p-8 shadow-2xl my-8 relative overflow-hidden text-neutral-900"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600" />
          
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-tight">Onboard New Customer</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Create profile, set subscription, and sync to Firebase</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-600/10 border border-red-600/20 text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Account Information */}
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck size={14} /> 1. Contact & Identity
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Vikram Sharma"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 focus:bg-white outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. vikram@fitness.com"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 focus:bg-white outline-none"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 focus:bg-white outline-none"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">System Role</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                  >
                    <option value="user">Customer / Subscriber</option>
                    <option value="kitchen">Kitchen Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Subscription & Payment Setup */}
            <div className="space-y-3 pt-4 border-t border-neutral-200">
              <div className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                <Zap size={14} /> 2. Subscription & Plan Access
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Assigned Plan</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={planId}
                    onChange={e => handlePlanChange(e.target.value)}
                  >
                    {PLANS.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (₹{plan.price} / {plan.duration}d)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Plan Status</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={planStatus}
                    onChange={e => setPlanStatus(e.target.value as PlanStatus)}
                  >
                    <option value="active">Active (Payment Verified)</option>
                    <option value="pending">Pending Payment Verification</option>
                    <option value="none">No Active Plan</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Days Remaining</label>
                  <input 
                    type="number" 
                    min={0}
                    max={365}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={daysRemaining}
                    onChange={e => setDaysRemaining(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Delivery & Nutrition Profile */}
            <div className="space-y-3 pt-4 border-t border-neutral-200">
              <div className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                <Utensils size={14} /> 3. Diet, Logistics & Goals
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Delivery / Residence Address</label>
                  <input 
                    type="text" 
                    placeholder="Flat/House No, Building, Street, Area, City"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Consumption Method</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={consumptionMethod}
                    onChange={e => setConsumptionMethod(e.target.value)}
                  >
                    <option value="Delivery">Home / Office Delivery</option>
                    <option value="Dine-in">Dine-in at Café</option>
                    <option value="Takeaway">Self Takeaway</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Meal Preference</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={mealPreference}
                    onChange={e => setMealPreference(e.target.value)}
                  >
                    <option value="High Protein Non-Veg">High Protein Non-Veg</option>
                    <option value="Pure Vegetarian">Pure Vegetarian</option>
                    <option value="Eggitarian">Eggitarian</option>
                    <option value="Vegan">Vegan Clean</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Preferred Time Slot</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={preferredTimeSlot}
                    onChange={e => setPreferredTimeSlot(e.target.value)}
                  >
                    <option value="12:00 PM - 1:00 PM">12:00 PM - 1:00 PM</option>
                    <option value="1:00 PM - 2:00 PM">1:00 PM - 2:00 PM</option>
                    <option value="7:00 PM - 8:00 PM">7:00 PM - 8:00 PM</option>
                    <option value="8:00 PM - 9:00 PM">8:00 PM - 9:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Daily Protein Goal (g)</label>
                  <input 
                    type="number" 
                    min={40}
                    max={300}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={proteinGoal}
                    onChange={e => setProteinGoal(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Primary Fitness Goal</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={primaryGoal}
                    onChange={e => setPrimaryGoal(e.target.value)}
                  >
                    <option value="Muscle Building">Muscle Building / Hypertrophy</option>
                    <option value="Fat Loss">Fat Loss & Caloric Deficit</option>
                    <option value="Athletic Endurance">Athletic Endurance</option>
                    <option value="Healthy Lifestyle">Healthy Clean Lifestyle</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Food Allergies</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Peanut, Dairy, Gluten (or None)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={foodAllergies}
                    onChange={e => setFoodAllergies(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-500 tracking-wider block mb-1">Gender</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-bold text-neutral-900 focus:border-red-600 outline-none"
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black italic uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Clock size={16} className="animate-spin" /> Saving Customer...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Save & Register Customer
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
