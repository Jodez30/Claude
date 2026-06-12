import { useState } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  extra?: string;
}

interface Table {
  name: string;
  columns: Column[];
}

function parseSchema(schema: string): Table[] {
  const tables: Table[] = [];
  const tableRegex = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = tableRegex.exec(schema)) !== null) {
    const name = match[1];
    const body = match[2];
    const columns: Column[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^(\w+)\s+([\w()]+)(.*?)(?:,\s*)?$/);
      if (colMatch) {
        columns.push({
          name: colMatch[1],
          type: colMatch[2],
          extra: colMatch[3].trim(),
        });
      }
    }
    tables.push({ name, columns });
  }
  return tables;
}

const TYPE_COLORS: Record<string, string> = {
  INTEGER: 'text-amber-400',
  INT: 'text-amber-400',
  TEXT: 'text-emerald-400',
  REAL: 'text-blue-400',
  FLOAT: 'text-blue-400',
  BLOB: 'text-purple-400',
  NUMERIC: 'text-orange-400',
};

export default function SchemaViewer({ schema }: { schema: string }) {
  const tables = parseSchema(schema);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([tables[0]?.name]));

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Database size={14} className="text-slate-400" />
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Schema</span>
      </div>
      <div className="space-y-2">
        {tables.map((table) => {
          const isOpen = expanded.has(table.name);
          return (
            <div key={table.name} className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/30">
              <button
                onClick={() => toggle(table.name)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <span className="text-blue-300 sql-font text-sm font-semibold">{table.name}</span>
                <span className="ml-auto text-slate-600 text-xs">{table.columns.length} cols</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-700/30 px-3 pb-2 pt-1.5 space-y-1">
                  {table.columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-2">
                      <span className="text-slate-300 sql-font text-xs">{col.name}</span>
                      <span className={`text-xs sql-font ${TYPE_COLORS[col.type] || 'text-slate-400'}`}>
                        {col.type}
                      </span>
                      {col.extra?.includes('PRIMARY KEY') && (
                        <span className="text-xs text-yellow-500/70 bg-yellow-500/10 px-1.5 rounded">PK</span>
                      )}
                      {col.extra?.includes('NOT NULL') && (
                        <span className="text-xs text-red-400/70 bg-red-500/10 px-1.5 rounded">NN</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
