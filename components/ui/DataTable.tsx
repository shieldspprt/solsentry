import React from 'react';
import { StateBlock } from './StateBlock';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  numeric?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  isFilteredZero?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found.',
  isFilteredZero = false,
  onClearFilters,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return <StateBlock state="loading" className={className} />;
  }

  if (isFilteredZero) {
    return <StateBlock state="filtered_zero" onAction={onClearFilters} className={className} />;
  }

  if (data.length === 0) {
    return <StateBlock state="empty" description={emptyMessage} className={className} />;
  }

  return (
    <div className={`overflow-x-auto -mx-1 ${className}`}>
      <table className="w-full text-left border-collapse min-w-[560px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold text-slate-400 text-[13px] ${
                  col.align === 'center' || col.numeric ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }`}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]/60">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-white/[0.03] transition-colors group">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-slate-200 text-[15px] ${
                    col.numeric ? 'font-mono tabular-nums text-right' : col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
