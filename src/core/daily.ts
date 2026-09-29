/**
 * Günlük hedef ve seri. Cezalandırmayan tasarım:
 * - Bir gün kaçırılırsa haftada bir "dinlenme günü" otomatik devreye girer, seri sürer.
 * - Seri yine de biterse puan, jeton ya da hak kaybı olmaz; arayüz "yeni seri" der.
 * - Yanlış cevap hiçbir şeyi azaltmaz.
 */

/**
 * Günlük hedef: bir bulmacayı tamamlamak (tüm kelimeleri çözmek; yardım
 * serbest). Eskiden hedef "günde N doğru kelime" idi; bulmaca başına ~11 kelime
 * olduğundan tek bulmaca hedefi anlamsızca bitiriyordu.
 */
export const DAILY_PUZZLE_GOAL = 1;

export interface DailyState {
  /** Eski "günde N kelime" hedefi. Kayıt uyumu için duruyor; hedef hesabında kullanılmaz. */
  goal: number;
  day: string;
  /** Bugün doğru bilinen kelime sayısı (yalnızca istatistik). */
  todayCorrect: number;
  /** Bugün tamamlanan bulmaca sayısı. Eski kayıtlarda yoktur; 0 ile tamamlanır. */
  todayPuzzles: number;
  streak: number;
  bestStreak: number;
  lastGoalDay: string | null;
  /** Kullanılan dinlenme günleri (YYYY-MM-DD). */
  restDays: string[];
  goalDays: number;
}

export const REST_DAY_EVERY = 7;

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

export function initialDaily(now: Date, goal = 10): DailyState {
  return {
    goal,
    day: dayKey(now),
    todayCorrect: 0,
    todayPuzzles: 0,
    streak: 0,
    bestStreak: 0,
    lastGoalDay: null,
    restDays: [],
    goalDays: 0,
  };
}

/** Gün değiştiyse sayaçları sıfırlar. */
export function rollDay(state: DailyState, now: Date): DailyState {
  const today = dayKey(now);
  return state.day === today ? state : { ...state, day: today, todayCorrect: 0, todayPuzzles: 0 };
}

/** Bugünün hedefi tamam mı (eski kelime hedefiyle bugün tamamlanmış olabilir). */
export function goalDoneToday(state: DailyState, now: Date): boolean {
  const today = dayKey(now);
  return state.lastGoalDay === today || (state.day === today && (state.todayPuzzles ?? 0) >= DAILY_PUZZLE_GOAL);
}

/** Bugün tamamlanan bulmaca sayısı (gösterim için). */
export function puzzlesToday(state: DailyState, now: Date): number {
  return state.day === dayKey(now) ? (state.todayPuzzles ?? 0) : 0;
}

function restDayAvailable(state: DailyState, today: string): boolean {
  return !state.restDays.some((d) => daysBetween(d, today) < REST_DAY_EVERY);
}

/** Bugün itibarıyla sürmekte olan seri (gösterim için). */
export function currentStreak(state: DailyState, now: Date): { streak: number; restDayNeeded: boolean } {
  if (!state.lastGoalDay) return { streak: 0, restDayNeeded: false };
  const gap = daysBetween(state.lastGoalDay, dayKey(now));
  if (gap <= 1) return { streak: state.streak, restDayNeeded: false };
  if (gap === 2 && restDayAvailable(state, dayKey(now))) return { streak: state.streak, restDayNeeded: true };
  return { streak: 0, restDayNeeded: false };
}

/** Doğru bilinen bir kelimeyi sayar. Yalnızca istatistiktir; hedefi etkilemez. */
export function recordCorrect(state: DailyState, now: Date): DailyState {
  const s = rollDay(state, now);
  return { ...s, todayCorrect: s.todayCorrect + 1 };
}

/** Tamamlanan bir bulmacayı sayar; hedef bugün ilk kez tamamlanırsa seriyi ilerletir. */
export function recordPuzzleDone(state: DailyState, now: Date): { state: DailyState; goalReached: boolean; usedRestDay: boolean } {
  const s = rollDay(state, now);
  const today = s.day;
  const todayPuzzles = (s.todayPuzzles ?? 0) + 1;
  if (todayPuzzles < DAILY_PUZZLE_GOAL || s.lastGoalDay === today) {
    return { state: { ...s, todayPuzzles }, goalReached: false, usedRestDay: false };
  }
  let streak = 1;
  let usedRestDay = false;
  let restDays = s.restDays;
  if (s.lastGoalDay) {
    const gap = daysBetween(s.lastGoalDay, today);
    if (gap === 1) streak = s.streak + 1;
    else if (gap === 2 && restDayAvailable(s, today)) {
      streak = s.streak + 1;
      usedRestDay = true;
      restDays = [...s.restDays, shiftDay(today, -1)].slice(-5);
    }
  }
  return {
    state: {
      ...s,
      todayPuzzles,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      lastGoalDay: today,
      restDays,
      goalDays: s.goalDays + 1,
    },
    goalReached: true,
    usedRestDay,
  };
}
