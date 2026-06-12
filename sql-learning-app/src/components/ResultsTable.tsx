import { Table, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { QueryResult } from '../hooks/useSQLEngine';

type FeedbackState = 'correct' | 'wrong' | null;

interface Props {
  result: QueryResult | null;
  feedback: FeedbackState;
  attempts: number;
}

export default function ResultsTable({ result, feedback, attempts }: Props) {
  if (!result && !feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-600">
        <Table size={36} strokeWidth={1} />
        <p className="text-sm">Results will appear here</p>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 fade-in">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm mb-1">SQL Error</p>
            <p className="text-red-400/80 text-xs sql-font leading-relaxed">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Feedback banner */}
      {feedback === 'correct' && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center gap-3 slide-up success-pop">
          <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 font-bold text-sm">Correct! 🎉</p>
            <p className="text-emerald-400/70 text-xs">XP earned and lesson complete!</p>
          </div>
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-4 py-3 flex items-center gap-3 slide-up shake">
          <XCircle size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 font-bold text-sm">Not quite — keep trying!</p>
            <p className="text-red-400/70 text-xs">{attempts > 1 ? 'Try the hint button for help' : 'Check your query and run it again'}</p>
          </div>
        </div>
      )}

      {/* Result table */}
      {result && result.rows.length > 0 && (
        <div className="fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-medium">
              {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
            </span>
            {result.time !== undefined && (
              <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Clock size={11} />
                {result.time}ms
              </span>
            )}
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-700/50">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left">
                <thead>
                  <tr className="bg-slate-800/80">
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-xs font-semibold text-blue-300 sql-font uppercase tracking-wide whitespace-nowrap border-b border-slate-700/50"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-800/60 transition-colors ${
                        i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'
                      }`}
                    >
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-xs text-slate-300 sql-font whitespace-nowrap"
                        >
                          {row[col] === null || row[col] === undefined ? (
                            <span className="text-slate-600 italic">NULL</span>
                          ) : typeof row[col] === 'number' ? (
                            <span className="text-amber-300">{String(row[col])}</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {result && result.rows.length === 0 && !result.error && (
        <div className="text-center py-6 fade-in">
          <p className="text-slate-500 text-sm">Query ran successfully — 0 rows returned</p>
          <p className="text-slate-600 text-xs mt-1">Try adjusting your WHERE clause</p>
        </div>
      )}
    </div>
  );
}
