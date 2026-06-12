import { useState, useCallback, useRef } from 'react';
import type { SqlJsStatic, Database } from 'sql.js';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  error?: string;
  time?: number;
}

let sqljs: SqlJsStatic | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqljs) return sqljs;
  const initSqlJs = (await import('sql.js')).default;
  sqljs = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });
  return sqljs;
}

export function useSQLEngine() {
  const [loading, setLoading] = useState(false);
  const dbRef = useRef<Database | null>(null);

  const initDB = useCallback(async (schema: string, seedData: string): Promise<void> => {
    const SQL = await getSqlJs();
    if (dbRef.current) {
      dbRef.current.close();
    }
    const db = new SQL.Database();
    db.run(schema);
    db.run(seedData);
    dbRef.current = db;
  }, []);

  const runQuery = useCallback((sql: string): QueryResult => {
    if (!dbRef.current) {
      return { columns: [], rows: [], error: 'Database not initialized' };
    }
    const start = performance.now();
    try {
      const results = dbRef.current.exec(sql.trim());
      const time = Math.round(performance.now() - start);
      if (!results.length) {
        return { columns: [], rows: [], time };
      }
      const { columns, values } = results[0];
      const rows = values.map((row) =>
        Object.fromEntries(columns.map((col, i) => [col, row[i]]))
      );
      return { columns, rows, time };
    } catch (err) {
      return {
        columns: [],
        rows: [],
        error: (err as Error).message,
        time: Math.round(performance.now() - start),
      };
    }
  }, []);

  return { initDB, runQuery, loading, setLoading };
}
