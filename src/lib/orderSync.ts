import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDocs, collection, query, where, writeBatch, Timestamp } from 'firebase/firestore';
import { UserProfile, MenuItem, Order } from '../types';
import { PLANS } from '../constants';
import { PLAN_MENUS, parseMenuDayString } from '../constants/planMenus';

/**
 * Format a Date object as YYYY-MM-DD in local time
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a date string YYYY-MM-DD
 */
export function addDaysToDateStr(baseDateStr: string, daysToAdd: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + daysToAdd);
  return formatDateYMD(date);
}

/**
 * Calculates which plan day (1-indexed) a given calendar date represents for a user based on their startDate.
 */
export function calculateCustomerPlanDay(startDateStr: string | undefined, targetDateStr: string, totalDuration: number = 20): number {
  if (!startDateStr) return 1;
  const startParts = startDateStr.split('-').map(Number);
  const targetParts = targetDateStr.split('-').map(Number);
  
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const target = new Date(targetParts[0], targetParts[1] - 1, targetParts[2]);
  
  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Prior to start date
  const dayNum = diffDays + 1;
  return Math.min(dayNum, totalDuration);
}

/**
 * Synchronize or generate day-by-day orders for a user's subscription in Firestore
 */
export async function syncUserSubscriptionOrders(user: UserProfile, customStartDate?: string): Promise<{ success: boolean; count: number; error?: string }> {
  if (!user || !user.uid || !user.planId) {
    return { success: false, count: 0, error: 'User or Plan ID missing' };
  }

  const plan = PLANS.find(p => p.id === user.planId);
  const planMenu = PLAN_MENUS[user.planId];
  if (!planMenu || planMenu.length === 0) {
    return { success: false, count: 0, error: `No menu schedule found for plan ${user.planId}` };
  }

  const duration = plan?.duration || planMenu.length;
  
  // Determine start date: use customStartDate, user.startDate, or tomorrow/today
  let baseDate = customStartDate || user.startDate;
  if (!baseDate) {
    const today = new Date();
    // If afternoon/evening, start tomorrow, else today
    if (today.getHours() >= 14) {
      today.setDate(today.getDate() + 1);
    }
    baseDate = formatDateYMD(today);
  }

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (let dayIdx = 0; dayIdx < duration; dayIdx++) {
      const daySchedule = parseMenuDayString(planMenu[dayIdx] || planMenu[dayIdx % planMenu.length], dayIdx);
      const deliveryDateStr = addDaysToDateStr(baseDate, dayIdx);
      
      const orderId = `order_${user.uid}_d${dayIdx + 1}_${deliveryDateStr}`;
      const orderRef = doc(db, 'orders', orderId);

      const items: MenuItem[] = daySchedule.items.map((item, i) => ({
        id: `${orderId}_item_${i}`,
        name: item.name,
        category: item.category,
        protein: item.protein,
        calories: item.calories || 350,
        price: 0,
        isTrialFixed: plan?.type === 'trial'
      }));

      const orderData: any = {
        id: orderId,
        userId: user.uid,
        userName: user.name || 'Alpino Subscriber',
        userEmail: user.email || '',
        userPhone: user.phone || '',
        userAddress: user.address || '',
        preferredTimeSlot: user.preferredTimeSlot || '8:00 AM - 9:00 AM',
        planId: user.planId,
        planName: plan?.name || 'Protein Plan',
        planType: plan?.type || (duration <= 5 ? 'trial' : 'pro'),
        dayNumber: dayIdx + 1,
        totalDays: duration,
        menuText: daySchedule.displayText,
        date: deliveryDateStr,
        items,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(orderRef, orderData, { merge: true });
      count++;
    }

    await batch.commit();
    return { success: true, count };
  } catch (error: any) {
    console.error('Error synchronizing subscription orders:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Synchronize all active subscribers in the system to ensure their day-by-day meals are in the kitchen panel
 */
export async function syncAllActiveSubscribers(usersList?: UserProfile[]): Promise<{ totalSynced: number; usersProcessed: number }> {
  try {
    let users = usersList;
    if (!users) {
      const snap = await getDocs(query(collection(db, 'users'), where('planStatus', '==', 'active')));
      users = snap.docs.map(d => ({ ...d.data() } as UserProfile));
    } else {
      users = users.filter(u => u.planStatus === 'active' && u.planId);
    }

    let totalSynced = 0;
    let usersProcessed = 0;

    for (const user of users) {
      if (user.planId) {
        const res = await syncUserSubscriptionOrders(user);
        if (res.success) {
          totalSynced += res.count;
          usersProcessed++;
        }
      }
    }

    return { totalSynced, usersProcessed };
  } catch (error) {
    console.error('Failed to batch sync subscribers:', error);
    return { totalSynced: 0, usersProcessed: 0 };
  }
}
