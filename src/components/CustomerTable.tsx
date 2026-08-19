import React, { useState } from 'react';
import { UserProfile, PaymentRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, ChevronUp, User, Phone, MapPin, Activity, 
  Calendar, Utensils, Trash2, CheckCircle, Clock, AlertCircle, 
  CreditCard, ExternalLink, ShieldAlert, Sparkles, Download, 
  Check, X, RefreshCw
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface CustomerTableProps {
  users: UserProfile[];
  payments?: PaymentRecord[];
  searchTerm: string;
  onUserDeleted?: (userId: string) => void;
  onUserUpdated?: (updatedUser: UserProfile) => void;
}

type SortField = 'name' | 'email' | 'planStatus' | 'startDate' | 'daysRemaining';
type FilterStatus = 'all' | 'active' | 'pending' | 'none';

export default function CustomerTable({ 
  users, 
  payments = [], 
  searchTerm, 
  onUserDeleted,
  onUserUpdated 
}: CustomerTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserProfile | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper to find payment for a given user
  const getUserPayment = (userId: string) => {
    const userPayments = payments.filter(p => p.userId === userId);
    if (userPayments.length === 0) return null;
    return userPayments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
  };

  const filteredUsers = users
    .filter(u => {
      const matchSearch = 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.planId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;

      if (filterStatus === 'active') return u.planStatus === 'active';
      if (filterStatus === 'pending') return u.planStatus === 'pending';
      if (filterStatus === 'none') return u.planStatus === 'none' || u.planStatus === 'expired' || !u.planStatus;
      return true;
    })
    .sort((a, b) => {
      let aVal: any = a[sortField] ?? '';
      let bVal: any = b[sortField] ?? '';
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

  const handleDeleteUser = async (userToDelete: UserProfile) => {
    setDeletingUserId(userToDelete.uid);
    try {
      // 1. Delete user doc from firestore
      const userRef = doc(db, 'users', userToDelete.uid);
      await deleteDoc(userRef);

      if (onUserDeleted) {
        onUserDeleted(userToDelete.uid);
      }
      setConfirmDeleteUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.uid}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleTogglePlanStatus = async (user: UserProfile, newStatus: 'active' | 'none') => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatePayload = {
        planStatus: newStatus,
        daysRemaining: newStatus === 'active' ? (user.daysRemaining > 0 ? user.daysRemaining : 30) : 0,
        updatedAt: Timestamp.now()
      };
      await updateDoc(userRef, updatePayload);
      if (onUserUpdated) {
        onUserUpdated({ ...user, ...updatePayload });
      }
    } catch (error) {
      console.error('Error updating plan status:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const headers = [
      'UID', 'Name', 'Email', 'Phone', 'Address', 'Role', 'Plan ID', 
      'Plan Status', 'Days Remaining', 'Start Date', 'Goal', 'Diet Preference', 
      'Time Slot', 'Protein Target (g)', 'Food Allergies', 'Created At'
    ];

    const rows = users.map(u => [
      `"${u.uid || ''}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${(u.address || '').replace(/"/g, '""')}"`,
      `"${u.role || 'user'}"`,
      `"${u.planId || ''}"`,
      `"${u.planStatus || 'none'}"`,
      `"${u.daysRemaining ?? 0}"`,
      `"${u.startDate || ''}"`,
      `"${u.primaryGoal || ''}"`,
      `"${u.mealPreference || ''}"`,
      `"${u.preferredTimeSlot || ''}"`,
      `"${u.proteinGoal ?? 0}"`,
      `"${(u.foodAllergies || '').replace(/"/g, '""')}"`,
      `"${u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toISOString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alpino_users_database_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-red-600" /> : <ChevronDown className="w-3 h-3 text-red-600" />;
  };

  const activeCount = users.filter(u => u.planStatus === 'active').length;
  const pendingCount = users.filter(u => u.planStatus === 'pending').length;
  const noPlanCount = users.filter(u => u.planStatus === 'none' || u.planStatus === 'expired' || !u.planStatus).length;

  return (
    <div className="space-y-6">
      {/* Filter and Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-100 p-3 md:p-4 rounded-2xl border border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterStatus === 'all' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'active' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
            }`}
          >
            <CheckCircle size={12} /> Paid / Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'pending' ? 'bg-yellow-500 text-black shadow-md' : 'bg-white text-yellow-700 hover:bg-yellow-50 border border-yellow-200'
            }`}
          >
            <Clock size={12} /> Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('none')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterStatus === 'none' ? 'bg-neutral-800 text-white shadow-md' : 'bg-white text-neutral-500 hover:bg-neutral-200 border border-neutral-200'
            }`}
          >
            No Plan / Expired ({noPlanCount})
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
        >
          <Download size={13} className="text-red-600" />
          <span>Export CSV Database</span>
        </button>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-neutral-50 border border-neutral-200 p-12 rounded-[2.5rem] text-center">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">No users match your criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  <th 
                    className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">User & Contact <SortIcon field="name" /></div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors select-none hidden sm:table-cell"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1.5">Email <SortIcon field="email" /></div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors select-none"
                    onClick={() => handleSort('planStatus')}
                  >
                    <div className="flex items-center gap-1.5">Subscription & Payment <SortIcon field="planStatus" /></div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 cursor-pointer hover:text-neutral-900 transition-colors select-none hidden md:table-cell"
                    onClick={() => handleSort('daysRemaining')}
                  >
                    <div className="flex items-center gap-1.5">Days Left <SortIcon field="daysRemaining" /></div>
                  </th>
                  <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredUsers.map(user => {
                  const payment = getUserPayment(user.uid);
                  const isExpanded = expandedUserId === user.uid;

                  return (
                    <React.Fragment key={user.uid}>
                      <tr className={`hover:bg-neutral-50/80 transition-colors ${isExpanded ? 'bg-red-50/20' : ''}`}>
                        {/* Name & Phone */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs uppercase ${
                              user.role === 'admin' ? 'bg-red-600 text-white' : 
                              user.role === 'kitchen' ? 'bg-yellow-500 text-black' :
                              user.planStatus === 'active' ? 'bg-green-600/15 text-green-700' : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {user.name ? user.name.slice(0, 2) : 'US'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-neutral-900 uppercase tracking-tight">
                                  {user.name || 'Unnamed Customer'}
                                </span>
                                {user.role === 'admin' && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-red-600 text-white rounded">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                                {user.phone ? `TEL: ${user.phone}` : user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="text-xs text-neutral-700 font-bold font-mono tracking-tight">{user.email}</div>
                          {user.gender && <div className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{user.gender} • {user.occupation || 'Member'}</div>}
                        </td>

                        {/* Subscription & Payment Status */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                user.planStatus === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
                                user.planStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-neutral-100 text-neutral-600 border-neutral-300'
                              }`}>
                                {user.planStatus === 'active' && <CheckCircle size={10} className="text-green-600" />}
                                {user.planStatus === 'pending' && <Clock size={10} className="text-yellow-600 animate-spin" />}
                                {user.planStatus === 'active' ? 'PAID / ACTIVE' : (user.planStatus || 'NO PLAN')}
                              </span>
                              
                              {payment && (
                                <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                  ₹{payment.amount}
                                </span>
                              )}
                            </div>
                            {user.planId && (
                              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                                Plan: <span className="text-neutral-900">{payment?.planName || user.planId}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Days Remaining */}
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="text-xs font-black text-neutral-900">
                            {user.planStatus === 'active' ? `${user.daysRemaining ?? 0} Days` : '-'}
                          </div>
                          {user.startDate && (
                            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                              Start: {user.startDate}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle Quick Details */}
                            <button 
                              id={`toggle-user-details-${user.uid}`}
                              onClick={() => setExpandedUserId(isExpanded ? null : user.uid)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-red-600 text-white border-red-600 shadow-md' 
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900'
                              }`}
                              title="View Full Profile & Payment Details"
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>

                            {/* Delete User Button */}
                            <button
                              id={`delete-user-${user.uid}`}
                              onClick={() => setConfirmDeleteUser(user)}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 transition-all cursor-pointer"
                              title="Remove User from Database"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-neutral-200 bg-neutral-50/80">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-6 md:p-8 space-y-6"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Card 1: Contact & Profile */}
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-sm">
                                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                                    <User size={14} /> Profile & Contact
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Full Name</span>
                                      <span className="font-bold text-neutral-900 uppercase">{user.name || 'Unnamed'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Email</span>
                                      <span className="font-bold text-neutral-900 font-mono text-[11px]">{user.email}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Phone</span>
                                      <span className="font-bold text-neutral-900">{user.phone || 'Not provided'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Gender / DOB</span>
                                      <span className="font-bold text-neutral-900">{user.gender || 'N/A'} {user.dob ? `(${user.dob})` : ''}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Occupation</span>
                                      <span className="font-bold text-neutral-900">{user.occupation || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Delivery Address</span>
                                      <span className="font-bold text-neutral-800 text-[11px] leading-relaxed block">{user.address || 'No address specified'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card 2: Diet & Logistics */}
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-sm">
                                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                                    <Utensils size={14} /> Nutrition & Logistics
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Diet Preference</span>
                                      <span className="font-bold text-neutral-900 uppercase">{user.mealPreference || 'High Protein Non-Veg'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Meal Types</span>
                                      <span className="font-bold text-neutral-900">{user.mealTypes || 'Lunch & Dinner'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Consumption Method</span>
                                      <span className="font-bold text-neutral-900">{user.consumptionMethod || 'Delivery'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Time Slot</span>
                                      <span className="font-bold text-neutral-900">{user.preferredTimeSlot || '1:00 PM - 2:00 PM'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Daily Protein Goal</span>
                                      <span className="font-bold text-red-600">{user.proteinGoal || 120} grams/day</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Food Allergies</span>
                                      <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block mt-0.5">
                                        {user.foodAllergies || 'None'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card 3: Goals & Fitness */}
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-sm">
                                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                                    <Activity size={14} /> Fitness & Goals
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Primary Goal</span>
                                      <span className="font-bold text-neutral-900">{user.primaryGoal || 'Muscle Building'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Workout Frequency</span>
                                      <span className="font-bold text-neutral-900">{user.workoutFrequency || '4-5 Days/Week'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Referral Source</span>
                                      <span className="font-bold text-neutral-900">{user.heardAboutUs || 'Organic / Word of Mouth'}</span>
                                    </div>
                                    <div className="pt-2 flex flex-wrap gap-1.5">
                                      {user.upgradeMeals === 'Yes' && <span className="bg-neutral-100 text-neutral-800 text-[8px] font-black uppercase px-2 py-1 rounded border border-neutral-200">Upgrade: Yes</span>}
                                      {user.socialMediaFeature === 'Yes' && <span className="bg-neutral-100 text-neutral-800 text-[8px] font-black uppercase px-2 py-1 rounded border border-neutral-200">Social: Yes</span>}
                                      {user.fitnessTips === 'Yes' && <span className="bg-neutral-100 text-neutral-800 text-[8px] font-black uppercase px-2 py-1 rounded border border-neutral-200">Tips: Yes</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* Card 4: Complete Payment & Verified Data */}
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-sm">
                                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                                    <CreditCard size={14} /> Completed Payment Data
                                  </h4>
                                  {payment ? (
                                    <div className="space-y-2 text-xs">
                                      <div>
                                        <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Payment Status</span>
                                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                                          payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                          payment.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {payment.status}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Amount Paid</span>
                                        <span className="font-black text-sm text-red-600">₹{payment.amount}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Transaction ID</span>
                                        <span className="font-mono text-[11px] font-bold text-neutral-800">{payment.transactionId || 'DIRECT_ENROLL'}</span>
                                      </div>
                                      {payment.verifiedBy && (
                                        <div>
                                          <span className="text-[9px] font-black uppercase text-neutral-400 block tracking-widest">Verified By</span>
                                          <span className="font-bold text-neutral-800">{payment.verifiedBy}</span>
                                        </div>
                                      )}
                                      {payment.screenshotUrl && (
                                        <button 
                                          onClick={() => setViewingScreenshot(payment.screenshotUrl || null)}
                                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-600 hover:text-red-700 underline mt-1"
                                        >
                                          <ExternalLink size={12} /> View Payment Receipt
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-neutral-500 py-3 space-y-1">
                                      <p className="font-bold">No linked payment record found.</p>
                                      <p className="text-[10px] text-neutral-400">User has not completed formal QR deposit or was registered manually.</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Footer for this user */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-200">
                                <div className="flex items-center gap-2">
                                  {user.planStatus === 'active' ? (
                                    <button
                                      onClick={() => handleTogglePlanStatus(user, 'none')}
                                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-black uppercase tracking-wider transition-colors border border-neutral-200 cursor-pointer"
                                    >
                                      Suspend / Pause Plan
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleTogglePlanStatus(user, 'active')}
                                      className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Check size={12} /> Activate 30-Day Subscription
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setConfirmDeleteUser(user)}
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 size={13} /> Remove User from System
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete User */}
      {confirmDeleteUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          onClick={() => setConfirmDeleteUser(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-neutral-200 rounded-[2rem] max-w-md w-full p-6 md:p-8 shadow-2xl text-neutral-900 relative"
          >
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600 mb-4">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-lg font-black italic uppercase text-center mb-2">Remove Customer Profile?</h3>
            <p className="text-xs text-neutral-600 text-center font-medium leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-neutral-900 font-bold">{confirmDeleteUser.name || confirmDeleteUser.email}</strong>? 
              This will permanently remove their profile and subscription data from Firebase Firestore.
            </p>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">User UID:</span>
                <span className="font-mono text-neutral-800 text-[10px]">{confirmDeleteUser.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Plan Status:</span>
                <span className="font-bold text-neutral-800 uppercase">{confirmDeleteUser.planStatus}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(deletingUserId)}
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black italic uppercase tracking-wider transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {deletingUserId ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/70 backdrop-blur-sm"
          onClick={() => setViewingScreenshot(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setViewingScreenshot(null)}
              className="absolute -top-10 right-0 text-white hover:text-red-400 p-2 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <img 
              src={viewingScreenshot} 
              alt="Payment Screenshot" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-neutral-700"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
