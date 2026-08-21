export interface PlanDaySchedule {
  dayNumber: number;
  displayText: string;
  rawMealName: string;
  items: {
    name: string;
    category: 'Bowl' | 'Smoothie' | 'Shake' | 'Wrap' | 'Sub' | 'Oats';
    protein: number;
    calories?: number;
  }[];
}

export const SHAKE_MENU_5_DAYS = [
  'Day 1 — Peanut Butter Banana Protein Shake',
  'Day 2 — Chocolate Protein Shake',
  'Day 3 — Cold Coffee Protein Shake',
  'Day 4 — Mango Protein Shake',
  'Day 5 — Strawberry Protein Shake'
];

export const SHAKE_PRO_MENU_20_DAYS = [
  'Day 1 — Peanut Butter Banana Protein Shake',
  'Day 2 — Strawberry Protein Shake',
  'Day 3 — Thandai Fusion Protein Shake',
  'Day 4 — Cold Coffee Protein Shake',
  'Day 5 — Mango Protein Shake',
  'Day 6 — Chocolate Protein Shake',
  'Day 7 — Peanut Butter Banana Protein Shake',
  'Day 8 — Strawberry Protein Shake',
  'Day 9 — Thandai Fusion Protein Shake',
  'Day 10 — Cold Coffee Protein Shake',
  'Day 11 — Mango Protein Shake',
  'Day 12 — Chocolate Protein Shake',
  'Day 13 — Peanut Butter Banana Protein Shake',
  'Day 14 — Strawberry Protein Shake',
  'Day 15 — Thandai Fusion Protein Shake',
  'Day 16 — Cold Coffee Protein Shake',
  'Day 17 — Mango Protein Shake',
  'Day 18 — Chocolate Protein Shake',
  'Day 19 — Peanut Butter Banana Protein Shake',
  'Day 20 — Strawberry Protein Shake'
];

export const SMOOTHIE_MENU_5_DAYS = [
  'Day 1 — Gym Special Protein Smoothie',
  'Day 2 — Peanut Butter Banana Oats Protein Smoothie',
  'Day 3 — Caffiene Warrior Protein Smoothie',
  'Day 4 — Mango Surge Protein Smoothie',
  'Day 5 — Blueberry Smoothie With Peanut Butter'
];

export const SMOOTHIE_PRO_MENU_20_DAYS = [
  'Day 1 — Gym Special Protein Smoothie',
  'Day 2 — Caffiene Warrior Protein Smoothie',
  'Day 3 — Peanut Butter Banana Oats Protein Smoothie',
  'Day 4 — Mango Surge Protein Smoothie',
  'Day 5 — Strawberry Hit Protein Smoothie',
  'Day 6 — Blueberry Smoothie With Peanut Butter',
  'Day 7 — Chocolate Smoothie',
  'Day 8 — Gym Special Protein Smoothie',
  'Day 9 — Caffiene Warrior Protein Smoothie',
  'Day 10 — Peanut Butter Banana Oats Protein Smoothie',
  'Day 11 — Mango Surge Protein Smoothie',
  'Day 12 — Strawberry Hit Protein Smoothie',
  'Day 13 — Blueberry Smoothie With Peanut Butter',
  'Day 14 — Chocolate Smoothie',
  'Day 15 — Gym Special Protein Smoothie',
  'Day 16 — Caffiene Warrior Protein Smoothie',
  'Day 17 — Peanut Butter Banana Oats Protein Smoothie',
  'Day 18 — Mango Surge Protein Smoothie',
  'Day 19 — Strawberry Hit Protein Smoothie',
  'Day 20 — Blueberry Smoothie With Peanut Butter'
];

export const BOWL_MENU_5_DAYS = [
  'Day 1 — Muscle Mania Makhni Rice Bowl',
  'Day 2 — Calorie Killer Chole Salad Bowl',
  'Day 3 — Chole Power Rice Bowl',
  'Day 4 — Mexican Paneer Rice Bowl',
  'Day 5 — Soba Noodle With Peanut Butter Bowl'
];

export const BOWL_PRO_MENU_20_DAYS = [
  'Day 1 — Calorie Killer Chole Salad Bowl',
  'Day 2 — Chole Power Rice Bowl',
  'Day 3 — Muscle Mania Makhni Rice Bowl',
  'Day 4 — Mexican Paneer Rice Bowl',
  'Day 5 — Lean Mexi Cali Salad Bowl',
  'Day 6 — Soba Noodle With Peanut Butter Bowl',
  'Day 7 — Pad Thai Soba Noodles',
  'Day 8 — Calorie Killer Chole Salad Bowl',
  'Day 9 — Chole Power Rice Bowl',
  'Day 10 — Muscle Mania Makhni Rice Bowl',
  'Day 11 — Mexican Paneer Rice Bowl',
  'Day 12 — Lean Mexi Cali Salad Bowl',
  'Day 13 — Soba Noodle With Peanut Butter Bowl',
  'Day 14 — Pad Thai Soba Noodles',
  'Day 15 — Calorie Killer Chole Salad Bowl',
  'Day 16 — Chole Power Rice Bowl',
  'Day 17 — Muscle Mania Makhni Rice Bowl',
  'Day 18 — Mexican Paneer Rice Bowl',
  'Day 19 — Lean Mexi Cali Salad Bowl',
  'Day 20 — Soba Noodle With Peanut Butter Bowl'
];

export const COMBO_MENU_5_DAYS = [
  'Day 1 — Muscle Mania Makhni Rice Bowl + Peanut Butter Banana Protein Shake',
  'Day 2 — Calorie Killer Chole Salad Bowl + Chocolate Protein Shake',
  'Day 3 — Chole Power Rice Bowl + Cold Coffee Protein Shake',
  'Day 4 — Mexican Paneer Rice Bowl + Mango Protein Shake',
  'Day 5 — Lean Mexi Cali Salad Bowl + Strawberry Protein Shake'
];

export const COMBO_PRO_MENU_20_DAYS = [
  'Day 1 — Calorie Killer Chole Salad Bowl + Peanut Butter Banana Protein Shake',
  'Day 2 — Chole Power Rice Bowl + Strawberry Protein Shake',
  'Day 3 — Muscle Mania Makhni Rice Bowl + Thandai Fusion Protein Shake',
  'Day 4 — Mexican Paneer Rice Bowl + Cold Coffee Protein Shake',
  'Day 5 — Lean Mexi Cali Salad Bowl + Mango Protein Shake',
  'Day 6 — Soba Noodle With Peanut Butter Bowl + Chocolate Protein Shake',
  'Day 7 — Pad Thai Soba Noodles + Peanut Butter Banana Protein Shake',
  'Day 8 — Calorie Killer Chole Salad Bowl + Strawberry Protein Shake',
  'Day 9 — Chole Power Rice Bowl + Thandai Fusion Protein Shake',
  'Day 10 — Muscle Mania Makhni Rice Bowl + Cold Coffee Protein Shake',
  'Day 11 — Mexican Paneer Rice Bowl + Mango Protein Shake',
  'Day 12 — Lean Mexi Cali Salad Bowl + Chocolate Protein Shake',
  'Day 13 — Soba Noodle With Peanut Butter Bowl + Peanut Butter Banana Protein Shake',
  'Day 14 — Pad Thai Soba Noodles + Strawberry Protein Shake',
  'Day 15 — Calorie Killer Chole Salad Bowl + Thandai Fusion Protein Shake',
  'Day 16 — Chole Power Rice Bowl + Cold Coffee Protein Shake',
  'Day 17 — Muscle Mania Makhni Rice Bowl + Mango Protein Shake',
  'Day 18 — Mexican Paneer Rice Bowl + Chocolate Protein Shake',
  'Day 19 — Lean Mexi Cali Salad Bowl + Peanut Butter Banana Protein Shake',
  'Day 20 — Soba Noodle With Peanut Butter Bowl + Strawberry Protein Shake'
];

export const BOWL_SMOOTHIE_MENU_5_DAYS = [
  'Day 1 — Muscle Mania Makhni Rice Bowl + Gym Special Protein Smoothie',
  'Day 2 — Calorie Killer Chole Salad Bowl + Mango Surge Protein Smoothie',
  'Day 3 — Chole Power Rice Bowl + Caffiene Warrior Protein Smoothie',
  'Day 4 — Mexican Paneer Rice Bowl + Strawberry Hit Protein Smoothie',
  'Day 5 — Lean Mexi Cali Salad Bowl + Blueberry Smoothie With Peanut Butter'
];

export const BOWL_SMOOTHIE_PRO_MENU_20_DAYS = [
  'Day 1 — Calorie Killer Chole Salad Bowl + Gym Special Protein Smoothie',
  'Day 2 — Chole Power Rice Bowl + Caffiene Warrior Protein Smoothie',
  'Day 3 — Muscle Mania Makhni Rice Bowl + Peanut Butter Banana Oats Protein Smoothie',
  'Day 4 — Mexican Paneer Rice Bowl + Mango Surge Protein Smoothie',
  'Day 5 — Lean Mexi Cali Salad Bowl + Strawberry Hit Protein Smoothie',
  'Day 6 — Soba Noodle With Peanut Butter Bowl + Blueberry Smoothie With Peanut Butter',
  'Day 7 — Pad Thai Soba Noodles + Chocolate Smoothie',
  'Day 8 — Calorie Killer Chole Salad Bowl + Gym Special Protein Smoothie',
  'Day 9 — Chole Power Rice Bowl + Caffiene Warrior Protein Smoothie',
  'Day 10 — Muscle Mania Makhni Rice Bowl + Peanut Butter Banana Oats Protein Smoothie',
  'Day 11 — Mexican Paneer Rice Bowl + Mango Surge Protein Smoothie',
  'Day 12 — Lean Mexi Cali Salad Bowl + Strawberry Hit Protein Smoothie',
  'Day 13 — Soba Noodle With Peanut Butter Bowl + Blueberry Smoothie With Peanut Butter',
  'Day 14 — Pad Thai Soba Noodles + Chocolate Smoothie',
  'Day 15 — Calorie Killer Chole Salad Bowl + Gym Special Protein Smoothie',
  'Day 16 — Chole Power Rice Bowl + Caffiene Warrior Protein Smoothie',
  'Day 17 — Muscle Mania Makhni Rice Bowl + Peanut Butter Banana Oats Protein Smoothie',
  'Day 18 — Mexican Paneer Rice Bowl + Mango Surge Protein Smoothie',
  'Day 19 — Lean Mexi Cali Salad Bowl + Strawberry Hit Protein Smoothie',
  'Day 20 — Soba Noodle With Peanut Butter Bowl + Blueberry Smoothie With Peanut Butter'
];

// Mapping of all 10 plans to their day-by-day menu array
export const PLAN_MENUS: Record<string, string[]> = {
  // 5 Trial Plans (5 Days)
  trial_shakes_only: SHAKE_MENU_5_DAYS,
  trial_smoothies_only: SMOOTHIE_MENU_5_DAYS,
  trial_food: BOWL_MENU_5_DAYS,
  trial_shakes: COMBO_MENU_5_DAYS,
  trial_smoothies: BOWL_SMOOTHIE_MENU_5_DAYS,

  // 5 Pro Plans (20 Days)
  pro_shakes_only: SHAKE_PRO_MENU_20_DAYS,
  pro_smoothies_only: SMOOTHIE_PRO_MENU_20_DAYS,
  pro_food: BOWL_PRO_MENU_20_DAYS,
  pro_shakes: COMBO_PRO_MENU_20_DAYS,
  pro_smoothies: BOWL_SMOOTHIE_PRO_MENU_20_DAYS
};

// Helper to determine category from an item's name
export function detectCategory(name: string): 'Bowl' | 'Smoothie' | 'Shake' | 'Wrap' | 'Sub' | 'Oats' {
  const lower = name.toLowerCase();
  if (lower.includes('shake')) return 'Shake';
  if (lower.includes('smoothie')) return 'Smoothie';
  if (lower.includes('bowl') || lower.includes('noodles') || lower.includes('salad') || lower.includes('rice')) return 'Bowl';
  if (lower.includes('wrap') || lower.includes('burrito') || lower.includes('shawarma')) return 'Wrap';
  if (lower.includes('sub')) return 'Sub';
  if (lower.includes('oats')) return 'Oats';
  return 'Bowl';
}

// Helper to parse individual meal components from a menu string like "Day 1 — Muscle Mania Bowl + Strawberry Shake"
export function parseMenuDayString(dayString: string, dayIndex: number): PlanDaySchedule {
  // Remove "Day X — " prefix if present
  const rawMeal = dayString.replace(/^Day\s*\d+\s*[—–-]\s*/i, '').trim();
  const parts = rawMeal.split('+').map(p => p.trim()).filter(Boolean);

  const items = parts.map((partName, idx) => {
    const category = detectCategory(partName);
    let protein = 30;
    if (category === 'Bowl') protein = 38;
    else if (category === 'Shake') protein = 32;
    else if (category === 'Smoothie') protein = 28;

    return {
      name: partName,
      category,
      protein,
      calories: category === 'Bowl' ? 520 : 310
    };
  });

  return {
    dayNumber: dayIndex + 1,
    displayText: dayString,
    rawMealName: rawMeal,
    items
  };
}

// Get parsed full schedule for any plan ID
export function getPlanSchedule(planId: string): PlanDaySchedule[] {
  const menuList = PLAN_MENUS[planId] || COMBO_PRO_MENU_20_DAYS;
  return menuList.map((str, idx) => parseMenuDayString(str, idx));
}
