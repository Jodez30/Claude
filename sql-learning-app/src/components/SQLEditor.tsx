import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Lightbulb, Play, RotateCcw } from 'lucide-react';

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER',
  'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
  'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NULL', 'IS',
  'RANK', 'OVER', 'ROW_NUMBER', 'DESC', 'ASC', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
];

function highlightSQL(sql: string): string {
  let result = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  result = result.replace(/(--[^\n]*)/g, '<span style="color:#64748b;font-style:italic">$1</span>');
  // Strings
  result = result.replace(/('(?:[^'\\]|\\.)*')/g, '<span style="color:#86efac">$1</span>');
  // Numbers
  result = result.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#fcd34d">$1</span>');
  // Keywords
  const kwPattern = new RegExp(`\\b(${SQL_KEYWORDS.join('|')})\\b`, 'gi');
  result = result.replace(kwPattern, (m) => `<span style="color:#93c5fd;font-weight:600">${m.toUpperCase()}</span>`);

  return result;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onReset: () => void;
  showHint: boolean;
  onToggleHint: () => void;
  hint: string;
  isRunning?: boolean;
}

export default function SQLEditor({
  value,
  onChange,
  onRun,
  onReset,
  showHint,
  onToggleHint,
  hint,
  isRunning,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = highlightSQL(value) + '\n';
    }
  }, [value]);

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };

  const editorStyle = {
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    letterSpacing: '0.02em',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Editor box */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-600/50 bg-slate-900">
        {/* Line gutter */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-800/60 border-r border-slate-700/30 flex flex-col items-center pt-3 gap-[25.6px] pointer-events-none">
          {value.split('\n').map((_, i) => (
            <span key={i} style={{ fontSize: '11px', lineHeight: '1', color: '#475569' }}>{i + 1}</span>
          ))}
        </div>

        {/* Syntax highlight layer */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="absolute inset-0 pl-10 pr-3 pt-3 pb-3 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-transparent"
          style={editorStyle}
        />

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          rows={Math.min(10, Math.max(4, value.split('\n').length + 1))}
          placeholder="Write your SQL here..."
          className="relative w-full pl-10 pr-3 pt-3 pb-3 bg-transparent text-slate-200 resize-none outline-none caret-blue-400 placeholder:text-slate-600"
          style={editorStyle}
        />
      </div>

      {/* Hint panel */}
      {showHint && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 slide-up">
          <p className="text-amber-300 text-sm font-medium mb-1">💡 Hint</p>
          <p className="text-amber-200/80 text-sm sql-font">{hint}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onToggleHint}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
            showHint
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
          }`}
        >
          <Lightbulb size={16} />
          Hint
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 text-slate-400 transition-all active:scale-95"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onRun}
          disabled={isRunning || !value.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 shadow-lg shadow-blue-900/30"
        >
          <Play size={16} fill="currentColor" />
          {isRunning ? 'Running…' : 'Run Query'}
        </button>
      </div>
    </div>
  );
}
