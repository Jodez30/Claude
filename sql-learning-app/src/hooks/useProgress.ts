import { useState, useCallback, useEffect } from 'react';

interface ProgressState {
  completedLessons: Set<string>;
  xp: number;
  streak: number;
  lastActivity: string;
}

const STORAGE_KEY = 'sqlquest_progress';

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLessons: new Set(), xp: 0, streak: 0, lastActivity: '' };
    const parsed = JSON.parse(raw);
    return {
      completedLessons: new Set(parsed.completedLessons || []),
      xp: parsed.xp || 0,
      streak: parsed.streak || 0,
      lastActivity: parsed.lastActivity || '',
    };
  } catch {
    return { completedLessons: new Set(), xp: 0, streak: 0, lastActivity: '' };
  }
}

function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedLessons: [...state.completedLessons],
      xp: state.xp,
      streak: state.streak,
      lastActivity: state.lastActivity,
    }));
  } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const completeLesson = useCallback((lessonId: string, xpReward: number) => {
    setProgress((prev) => {
      if (prev.completedLessons.has(lessonId)) return prev;
      const today = new Date().toDateString();
      const wasYesterday = prev.lastActivity
        ? new Date(prev.lastActivity).getTime() >= Date.now() - 86400000 * 2
        : false;
      const newStreak = wasYesterday ? prev.streak + 1 : 1;
      const next: ProgressState = {
        completedLessons: new Set([...prev.completedLessons, lessonId]),
        xp: prev.xp + xpReward,
        streak: newStreak,
        lastActivity: today,
      };
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    const fresh: ProgressState = { completedLessons: new Set(), xp: 0, streak: 0, lastActivity: '' };
    setProgress(fresh);
  }, []);

  return { progress, completeLesson, resetProgress };
}
