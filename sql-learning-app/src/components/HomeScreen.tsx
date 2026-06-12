import { modules, allLessons } from '../data/lessons';
import type { Module } from '../data/lessons';
import { Flame, Zap, Trophy, ChevronRight, Lock, CheckCircle2, Star } from 'lucide-react';

interface Props {
  completedLessons: Set<string>;
  xp: number;
  streak: number;
  onSelectLesson: (lessonId: string) => void;
}

const DIFFICULTY_COLORS = {
  beginner: 'text-emerald-400 bg-emerald-400/10',
  intermediate: 'text-amber-400 bg-amber-400/10',
  advanced: 'text-rose-400 bg-rose-400/10',
};

function XPBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ModuleCard({ module, completedLessons, onSelectLesson, isUnlocked }: {
  module: Module;
  completedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
  isUnlocked: boolean;
}) {
  const done = module.lessons.filter((l) => completedLessons.has(l.id)).length;
  const total = module.lessons.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div className="mb-4 fade-in">
      <div className={`rounded-2xl overflow-hidden border transition-all ${
        isUnlocked
          ? 'border-slate-700/50 bg-slate-800/60'
          : 'border-slate-800 bg-slate-900/40 opacity-60'
      }`}>
        {/* Module header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${module.color} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,white,transparent)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base">{module.title}</h3>
              <p className="text-white/70 text-xs mt-0.5">{module.description}</p>
            </div>
            <div className="text-right">
              <span className="text-white font-semibold text-sm">{done}/{total}</span>
              {allDone && <div className="text-xs text-white/80 flex items-center gap-1 justify-end mt-0.5"><Star size={10} fill="currentColor" /> Complete</div>}
            </div>
          </div>
          <div className="mt-2 bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Lessons list */}
        <div className="divide-y divide-slate-700/30">
          {module.lessons.map((lesson, idx) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isAvailable = isUnlocked && (idx === 0 || completedLessons.has(module.lessons[idx - 1].id));
            const isLocked = !isAvailable;

            return (
              <button
                key={lesson.id}
                disabled={isLocked}
                onClick={() => !isLocked && onSelectLesson(lesson.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                  isLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isCompleted
                    ? 'hover:bg-slate-700/20'
                    : 'hover:bg-slate-700/30 active:bg-slate-700/40'
                }`}
              >
                <div className="text-2xl w-9 h-9 flex items-center justify-center flex-shrink-0">
                  {isLocked ? <Lock size={18} className="text-slate-500" /> : lesson.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isCompleted ? 'text-slate-300' : 'text-white'}`}>
                      {lesson.title}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                      {lesson.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{lesson.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : !isLocked ? (
                    <>
                      <span className="text-xs text-amber-400 font-semibold">+{lesson.xp} XP</span>
                      <ChevronRight size={16} className="text-slate-500" />
                    </>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ completedLessons, xp, streak, onSelectLesson }: Props) {
  const level = Math.floor(xp / 300) + 1;
  const xpInLevel = xp % 300;

  return (
    <div className="flex flex-col h-full animated-gradient">
      {/* Header */}
      <div className="pt-safe px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SQLQuest</h1>
            <p className="text-slate-400 text-sm">Learn SQL on your phone</p>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded-full px-2.5 py-1.5">
                <Flame size={14} className="text-orange-400" />
                <span className="text-orange-300 text-xs font-bold">{streak}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 rounded-full px-2.5 py-1.5">
              <Zap size={14} className="text-blue-400" />
              <span className="text-blue-300 text-xs font-bold">{xp}</span>
            </div>
          </div>
        </div>

        {/* Level progress */}
        <div className="glass rounded-2xl p-4 border border-slate-700/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Trophy size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Level {level}</p>
                <p className="text-slate-400 text-xs">{xpInLevel}/300 XP</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm font-medium">{completedLessons.size}/{allLessons.length}</p>
              <p className="text-slate-500 text-xs">lessons done</p>
            </div>
          </div>
          <XPBar current={xpInLevel} total={300} />
        </div>
      </div>

      {/* Modules list */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe">
        {modules.map((module, moduleIdx) => {
          const prevModule = modules[moduleIdx - 1];
          const isUnlocked =
            moduleIdx === 0 ||
            (prevModule?.lessons.every((l) => completedLessons.has(l.id)) ?? false);

          return (
            <ModuleCard
              key={module.id}
              module={module}
              completedLessons={completedLessons}
              onSelectLesson={onSelectLesson}
              isUnlocked={isUnlocked}
            />
          );
        })}
        <div className="h-4" />
      </div>
    </div>
  );
}
