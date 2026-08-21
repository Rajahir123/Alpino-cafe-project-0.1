import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Order, UserProfile, OrderStatus } from '../types';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Zap, 
  Lock, 
  Calendar, 
  Users, 
  RefreshCw, 
  Phone, 
  MapPin, 
  Sparkles, 
  Search,
  Check,
  Flame
} from 'lucide-react';
import { PLANS } from '../constants';
import { PLAN_MENUS, parseMenuDayString } from '../constants/planMenus';
import { formatDateYMD, syncUserSubscriptionOrders, syncAllActiveSubscribers, addDaysToDateStr } from '../lib/orderSync';

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // View Controls
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateYMD(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubscriber, setSelectedSubscriber] = useState<UserProfile | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'service' | 'prep' | 'subscribers'>('service');

  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => {
      document.body.classList.remove("theme-light");
    };
  }, []);

  // Real-time Firestore Listeners for Orders and Active Users
  useEffect(() => {
    let unsubOrders: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;

    try {
      // 1. Listen for all orders
      const ordersQ = query(collection(db, 'orders'));
      unsubOrders = onSnapshot(ordersQ, (snap) => {
        const fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        setOrders(fetchedOrders);
        setLoading(false);
      }, (error) => {
        console.error("Orders listener error:", error);
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setLoading(false);
      });

      // 2. Listen for active subscribers
      const usersQ = query(collection(db, 'users'), where('planStatus', '==', 'active'));
      unsubUsers = onSnapshot(usersQ, (snap) => {
        const fetchedUsers = snap.docs.map(d => ({ ...d.data() } as UserProfile));
        setActiveUsers(fetchedUsers);
      }, (error) => {
        console.error("Users listener error:", error);
      });
    } catch (err) {
      console.error("Error setting up kitchen subscriptions:", err);
      setLoading(false);
    }

    return () => {
      unsubOrders?.();
      unsubUsers?.();
    };
  }, []);

  // Trigger one-click background sync of all active subscribers' day-by-day plan meals
  const handleBatchSync = async () => {
    setSyncing(true);
    setSyncMessage('Generating day-by-day plan menus for active subscribers...');
    try {
      const res = await syncAllActiveSubscribers(activeUsers);
      setSyncMessage(`Successfully synchronized ${res.totalSynced} meal tickets across ${res.usersProcessed} subscribers!`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage(`Sync error: ${err.message || 'Check connection'}`);
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Status Updater
  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const todayStr = formatDateYMD(new Date());

  // Filter orders for the selected date
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Date match
      const matchesDate = o.date === selectedDate;
      if (!matchesDate) return false;

      // Status match
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Category match
      if (selectedCategory !== 'all') {
        const hasCategory = o.items?.some(i => i.category?.toLowerCase() === selectedCategory.toLowerCase());
        if (!hasCategory) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = o.userName?.toLowerCase().includes(q);
        const matchesItem = o.items?.some(i => i.name.toLowerCase().includes(q)) || o.menuText?.toLowerCase().includes(q);
        const matchesPhone = o.userPhone?.toLowerCase().includes(q);
        if (!matchesName && !matchesItem && !matchesPhone) return false;
      }

      return true;
    });
  }, [orders, selectedDate, statusFilter, selectedCategory, searchQuery]);

  // Aggregate Batch Prep for Selected Date
  const batchPrepSummary = useMemo(() => {
    const dateOrders = orders.filter(o => o.date === selectedDate && o.status !== 'delivered');
    const itemCounts: Record<string, { name: string; count: number; category: string; protein: number }> = {};
    let totalItems = 0;
    let totalBowls = 0;
    let totalShakes = 0;
    let totalSmoothies = 0;

    dateOrders.forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          totalItems++;
          if (item.category === 'Bowl') totalBowls++;
          if (item.category === 'Shake') totalShakes++;
          if (item.category === 'Smoothie') totalSmoothies++;

          if (!itemCounts[item.name]) {
            itemCounts[item.name] = {
              name: item.name,
              count: 0,
              category: item.category || 'Bowl',
              protein: item.protein || 30
            };
          }
          itemCounts[item.name].count += 1;
        });
      } else if (o.menuText) {
        // Fallback parse
        const daySchedule = parseMenuDayString(o.menuText, (o.dayNumber || 1) - 1);
        daySchedule.items.forEach(item => {
          totalItems++;
          if (item.category === 'Bowl') totalBowls++;
          if (item.category === 'Shake') totalShakes++;
          if (item.category === 'Smoothie') totalSmoothies++;

          if (!itemCounts[item.name]) {
            itemCounts[item.name] = {
              name: item.name,
              count: 0,
              category: item.category,
              protein: item.protein
            };
          }
          itemCounts[item.name].count += 1;
        });
      }
    });

    const list = Object.values(itemCounts).sort((a, b) => b.count - a.count);
    return { list, totalItems, totalBowls, totalShakes, totalSmoothies, totalOrders: dateOrders.length };
  }, [orders, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xl font-black italic uppercase tracking-widest text-neutral-900">SYNCING KITCHEN OS...</div>
        <p className="text-neutral-500 text-sm mt-2 font-medium">Connecting subscriber day-by-day meal plan pipelines</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-red-600 selection:text-white pb-20">
      
      {/* Top Kitchen OS Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <Utensils size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-600">Alpino Protein Café</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-neutral-900">
                Kitchen Prep & <span className="text-red-600">Plan Fulfillment OS</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Batch sync button */}
            <button
              onClick={handleBatchSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-100 text-neutral-800 rounded-xl border border-neutral-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              title="Generate / update daily meal schedule for all active subscribers"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin text-red-600" : "text-neutral-500"} />
              <span>{syncing ? 'Syncing Plans...' : 'Sync Subscriber Plans'}</span>
            </button>

            <Link 
              to="/hub" 
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all"
            >
              <Zap size={14} /> Hub
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('alpino_kitchen_authorized');
                window.location.reload();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl border border-neutral-200 text-xs font-bold transition-all cursor-pointer"
              title="Lock terminal"
            >
              <Lock size={13} /> Lock
            </button>
          </div>
        </div>

        {/* Sync notification banner if triggered */}
        {syncMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-3 py-2.5 px-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-red-600 shrink-0" />
              <span className="font-semibold">{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-neutral-400 hover:text-neutral-700 text-xs font-bold">✕</button>
          </motion.div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        
        {/* Main View Switcher & Date Controls */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shadow-sm">
          
          {/* Tabs: Service Tickets / Batch Prep / Subscriber Roster */}
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 shrink-0">
            <button
              onClick={() => setActiveViewTab('service')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeViewTab === 'service'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Utensils size={14} />
              <span>Daily Tickets ({filteredOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('prep')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeViewTab === 'prep'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Flame size={14} />
              <span>Batch Prep ({batchPrepSummary.totalItems})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('subscribers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeViewTab === 'subscribers'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Users size={14} />
              <span>Subscribers ({activeUsers.length})</span>
            </button>
          </div>

          {/* Date Selector Quick Bar */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === todayStr 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Today ({new Date().toLocaleDateString(undefined, { weekday: 'short' })})
            </button>

            <button
              onClick={() => setSelectedDate(addDaysToDateStr(todayStr, 1))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === addDaysToDateStr(todayStr, 1)
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Tomorrow
            </button>

            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg text-xs text-neutral-700">
              <Calendar size={13} className="text-red-600" />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-neutral-800 text-xs focus:outline-none cursor-pointer font-medium"
              />
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Total Day Orders</div>
              <div className="text-2xl font-black text-neutral-900 mt-1">{batchPrepSummary.totalOrders}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Utensils size={18} />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Bowls To Cook</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{batchPrepSummary.totalBowls}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-black text-xs">
              🍲
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Shakes To Blend</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{batchPrepSummary.totalShakes}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-black text-xs">
              🥤
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Smoothies</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{batchPrepSummary.totalSmoothies}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black text-xs">
              🍓
            </div>
          </div>
        </div>

        {/* ---------------- VIEW 1: DAILY KITCHEN TICKETS ---------------- */}
        {activeViewTab === 'service' && (
          <div className="space-y-6">
            
            {/* Search & Filter Sub-Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-grow max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search customer, meal, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-red-600 shadow-xs"
                />
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-neutral-200 text-neutral-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 shadow-xs font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="out-for-delivery">Out For Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-neutral-200 text-neutral-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 shadow-xs font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="bowl">Bowls Only</option>
                  <option value="shake">Shakes Only</option>
                  <option value="smoothie">Smoothies Only</option>
                </select>
              </div>
            </div>

            {/* Tickets Grid */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-dashed border-neutral-300 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <Utensils size={24} />
                </div>
                <div className="text-lg font-black uppercase text-neutral-800">
                  No meal tickets found for {selectedDate}
                </div>
                <p className="text-neutral-500 text-xs max-w-md mx-auto">
                  Either all tickets for this date are completed or the schedule for active subscribers needs to be populated. Click "Sync Subscriber Plans" above to auto-generate!
                </p>
                <button
                  onClick={handleBatchSync}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Sync Subscriber Plans
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map(order => {
                  const isTrial = order.planType === 'trial' || (order.totalDays && order.totalDays <= 5);
                  const statusColors = {
                    pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    preparing: 'bg-blue-50 text-blue-800 border-blue-200',
                    'out-for-delivery': 'bg-purple-50 text-purple-800 border-purple-200',
                    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  };

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md relative overflow-hidden group transition-all"
                    >
                      {/* Top ribbon: Plan and Day */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isTrial ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {isTrial ? '5-Day Trial' : '20-Day Pro'}
                            </span>
                            {order.dayNumber && (
                              <span className="text-[10px] font-black text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                                Day {order.dayNumber} of {order.totalDays || (isTrial ? 5 : 20)}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-neutral-900 leading-tight mt-1">{order.userName}</h3>
                        </div>

                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusColors[order.status] || 'text-neutral-500'}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Customer Metadata (Time slot, phone, address) */}
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 mb-3.5 space-y-1 text-xs text-neutral-600">
                        {order.preferredTimeSlot && (
                          <div className="flex items-center gap-1.5 text-neutral-800 font-bold">
                            <Clock size={12} className="text-red-600 shrink-0" />
                            <span>Slot: {order.preferredTimeSlot}</span>
                          </div>
                        )}
                        {order.userPhone && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Phone size={12} className="text-neutral-400 shrink-0" />
                            <a href={`tel:${order.userPhone}`} className="text-neutral-700 hover:text-red-600 underline decoration-neutral-300">
                              {order.userPhone}
                            </a>
                          </div>
                        )}
                        {order.userAddress && (
                          <div className="flex items-start gap-1.5">
                            <MapPin size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1 text-[11px] text-neutral-500">{order.userAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Prepared Meal Items List */}
                      <div className="space-y-2 mb-4">
                        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          Meals To Prepare ({order.items?.length || 1})
                        </div>

                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-neutral-900 leading-snug truncate">{item.name}</div>
                                <div className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                                  {item.protein ? `${item.protein}g protein` : ''}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                item.category === 'Bowl' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                item.category === 'Shake' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                item.category === 'Smoothie' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                'bg-neutral-200 text-neutral-700'
                              }`}>
                                {item.category || 'Meal'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            <div className="text-xs font-bold text-neutral-900">{order.menuText || 'Custom Plan Item'}</div>
                          </div>
                        )}
                      </div>

                      {/* Action Stage Controllers */}
                      <div className="pt-2 border-t border-neutral-100 flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(order.id, 'preparing')}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Utensils size={14} /> Start Prep
                          </button>
                        )}

                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateStatus(order.id, 'out-for-delivery')}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Truck size={14} /> Out For Delivery
                          </button>
                        )}

                        {order.status === 'out-for-delivery' && (
                          <button
                            onClick={() => updateStatus(order.id, 'delivered')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Mark Delivered
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                            <Check size={14} /> Completed
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- VIEW 2: BATCH PREPARATION SUMMARY ---------------- */}
        {activeViewTab === 'prep' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-200">
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tight text-neutral-900 flex items-center gap-2">
                    <Flame size={20} className="text-red-600" />
                    Kitchen Batch Production Counter ({selectedDate})
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1 font-medium">
                    Consolidated cooking and blending quantities needed for all active customer orders on this date.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-700 uppercase tracking-wider">
                    {batchPrepSummary.totalItems} Total Prep Units
                  </div>
                </div>
              </div>

              {batchPrepSummary.list.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-sm font-bold">
                  No active preparation items pending for {selectedDate}.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                  {batchPrepSummary.list.map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-neutral-300 hover:bg-white transition-all shadow-xs"
                    >
                      <div className="space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          item.category === 'Bowl' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          item.category === 'Shake' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {item.category}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900 leading-snug">{item.name}</h4>
                        <div className="text-[11px] text-neutral-500 font-medium">{item.protein}g Protein per serving</div>
                      </div>

                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-red-50 border border-red-200 rounded-2xl shrink-0">
                        <span className="text-2xl font-black text-red-600 leading-none">{item.count}</span>
                        <span className="text-[9px] font-black text-neutral-500 uppercase mt-0.5">QTY</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- VIEW 3: SUBSCRIBER ROSTER & FULL 5/20-DAY TIMELINE ---------------- */}
        {activeViewTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* Left Column: Active Subscribers List */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                    <Users size={16} className="text-red-600" />
                    Active Subscribers ({activeUsers.length})
                  </h3>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {activeUsers.map(user => {
                    const plan = PLANS.find(p => p.id === user.planId);
                    const isSelected = selectedSubscriber?.uid === user.uid;
                    const isTrial = plan?.type === 'trial' || (plan?.duration && plan.duration <= 5);

                    return (
                      <div
                        key={user.uid}
                        onClick={() => setSelectedSubscriber(user)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 border-red-300 text-neutral-900 shadow-xs'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-xs text-neutral-900">{user.name || user.email}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5">{plan?.name || user.planId || 'Plan Active'}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            isTrial ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {isTrial ? '5-Day' : '20-Day'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-2 pt-2 border-t border-neutral-200 font-medium">
                          <span>Start: {user.startDate || 'Current'}</span>
                          <span>Slot: {user.preferredTimeSlot || '8-9 AM'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {activeUsers.length === 0 && (
                    <div className="text-center p-8 text-neutral-400 text-xs">
                      No active subscribers registered yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Day-by-Day 5-day or 20-day plan inspect drawer */}
              <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-sm">
                {selectedSubscriber ? (
                  <div>
                    {/* Subscriber Header Card */}
                    <div className="pb-5 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-red-600">Plan Day-by-Day Schedule</div>
                        <h2 className="text-xl font-black text-neutral-900">{selectedSubscriber.name}</h2>
                        <p className="text-xs text-neutral-500 font-medium">{selectedSubscriber.email} • {selectedSubscriber.phone || 'No phone'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => syncUserSubscriptionOrders(selectedSubscriber)}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold border border-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={12} /> Sync Customer Schedule
                        </button>
                      </div>
                    </div>

                    {/* 5-day or 20-day day-by-day menu table */}
                    <div className="pt-4 space-y-3">
                      {(() => {
                        const planId = selectedSubscriber.planId || 'trial_shakes';
                        const plan = PLANS.find(p => p.id === planId);
                        const menuList = PLAN_MENUS[planId] || [];

                        return (
                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {menuList.map((menuStr, idx) => {
                              const dayNum = idx + 1;
                              const targetDate = addDaysToDateStr(selectedSubscriber.startDate || todayStr, idx);
                              const parsed = parseMenuDayString(menuStr, idx);

                              return (
                                <div
                                  key={idx}
                                  className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-300 hover:bg-white transition-all shadow-xs"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex flex-col items-center justify-center shrink-0">
                                      <span className="text-[9px] font-black uppercase text-neutral-500">Day</span>
                                      <span className="text-sm font-black text-red-600 leading-none">{dayNum}</span>
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-neutral-900">{parsed.rawMealName}</div>
                                      <div className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                                        Date: {targetDate}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                    {parsed.items.map((it, i) => (
                                      <span 
                                        key={i}
                                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                          it.category === 'Bowl' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                          it.category === 'Shake' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                      >
                                        {it.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <Users size={32} className="mx-auto text-neutral-300" />
                    <div className="text-sm font-black uppercase text-neutral-400">Select a subscriber from the list</div>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Click any customer to inspect their full 5-day trial or 20-day pro subscription menu breakdown.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
