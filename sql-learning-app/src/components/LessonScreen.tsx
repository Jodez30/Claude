import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, BookOpen, Terminal, ChevronRight, Zap } from 'lucide-react';
import type { Lesson } from '../data/lessons';
import { useSQLEngine } from '../hooks/useSQLEngine';
import type { QueryResult } from '../hooks/useSQLEngine';
import SQLEditor from './SQLEditor';
import ResultsTable from './ResultsTable';
import SchemaViewer from './SchemaViewer';

type Tab = 'learn' | 'challenge';
type Feedback = 'correct' | 'wrong' | null;

interface Props {
  lesson: Lesson;
  isCompleted: boolean;
  onBack: () => void;
  onComplete: (lessonId: string, xp: number) => void;
  onNext?: () => void;
}

function markdownToJSX(text: string): React.ReactElement[] {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="my-3 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900">
          <div className="px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/30 text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <span className="w-2 h-2 rounded-full bg-green-500/60" />
            <span className="ml-2">SQL</span>
          </div>
          <pre className="px-4 py-3 overflow-x-auto text-sm leading-relaxed sql-font text-slate-200">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Parse inline bold/code
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={j} className="sql-font text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">{part.slice(1, -1)}</code>;
      }
      return <span key={j}>{part}</span>;
    });

    elements.push(
      <p key={i} className="text-slate-300 text-sm leading-relaxed mb-2">{parts}</p>
    );
    i++;
  }

  return elements;
}


export default function LessonScreen({ lesson, isCompleted, onBack, onComplete, onNext }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(isCompleted ? 'challenge' : 'learn');
  const [sql, setSQL] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const { initDB, runQuery } = useSQLEngine();
  const hasCompleted = useRef(isCompleted);

  useEffect(() => {
    hasCompleted.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    setDbReady(false);
    initDB(lesson.schema, lesson.seedData).then(() => setDbReady(true));
    setSQL('');
    setResult(null);
    setFeedback(null);
    setShowHint(false);
    setAttempts(0);
  }, [lesson.id, initDB, lesson.schema, lesson.seedData]);

  const handleRun = useCallback(async () => {
    if (!dbReady || !sql.trim() || isRunning) return;
    setIsRunning(true);
    setResult(null);

    await new Promise((r) => setTimeout(r, 50));
    const res = runQuery(sql);
    setResult(res);
    setIsRunning(false);

    if (res.error) {
      setFeedback(null);
      setAttempts((a) => a + 1);
      return;
    }

    setAttempts((a) => a + 1);

    // Validate
    const isCorrect = lesson.validateFn
      ? lesson.validateFn(res.rows)
      : res.rows.length > 0 &&
        (lesson.expectedColumns.length === 0 ||
          lesson.expectedColumns.every((col) => res.columns.includes(col)));

    if (isCorrect) {
      setFeedback('correct');
      if (!hasCompleted.current) {
        onComplete(lesson.id, lesson.xp);
        hasCompleted.current = true;
      }
    } else {
      setFeedback('wrong');
    }
  }, [dbReady, sql, isRunning, runQuery, lesson, onComplete]);

  const handleReset = useCallback(() => {
    setSQL('');
    setResult(null);
    setFeedback(null);
    setShowHint(false);
  }, []);

  const DIFFICULTY_COLORS = {
    beginner: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    advanced: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{lesson.icon}</span>
            <h2 className="text-white font-bold text-base truncate">{lesson.title}</h2>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
              {lesson.difficulty}
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Zap size={11} />
              {lesson.xp} XP
            </span>
            {!dbReady && <span className="text-xs text-slate-500">Loading DB…</span>}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={() => setActiveTab('learn')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'learn'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen size={15} />
          Learn
        </button>
        <button
          onClick={() => setActiveTab('challenge')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'challenge'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal size={15} />
          Challenge
          {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'learn' ? (
          <div className="px-4 py-5">
            {/* Concept badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 mb-4">
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Concept</span>
              <span className="text-blue-300 sql-font text-sm font-bold">{lesson.concept}</span>
            </div>

            {/* Explanation */}
            <div className="mb-6">{markdownToJSX(lesson.explanation)}</div>

            {/* Schema */}
            <SchemaViewer schema={lesson.schema} />

            {/* Go to challenge button */}
            <button
              onClick={() => setActiveTab('challenge')}
              className="mt-6 w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/30 hover:bg-blue-500"
            >
              Try the Challenge
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4 pb-safe">
            {/* Challenge prompt */}
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Your Challenge</p>
              <div className="text-sm leading-relaxed">
                {lesson.challenge.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                    : <span key={i} className="text-slate-300">{part}</span>
                ))}
              </div>
            </div>

            {/* Schema (collapsed) */}
            <SchemaViewer schema={lesson.schema} />

            {/* Editor */}
            <SQLEditor
              value={sql}
              onChange={setSQL}
              onRun={handleRun}
              onReset={handleReset}
              showHint={showHint}
              onToggleHint={() => setShowHint((v) => !v)}
              hint={lesson.hint}
              isRunning={isRunning}
            />

            {/* Results */}
            <ResultsTable result={result} feedback={feedback} attempts={attempts} />

            {/* Next lesson button */}
            {feedback === 'correct' && onNext && (
              <button
                onClick={onNext}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/30 slide-up hover:bg-emerald-500"
              >
                Next Lesson
                <ChevronRight size={18} />
              </button>
            )}

            {/* Back when already completed and no next */}
            {feedback === 'correct' && !onNext && (
              <button
                onClick={onBack}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/30 slide-up"
              >
                Back to Lessons
              </button>
            )}

            <div className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}
