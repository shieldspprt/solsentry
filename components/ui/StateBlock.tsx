'use client';

import React from 'react';
import { Button } from './Button';

export interface StateBlockProps {
  state: 'loading' | 'empty' | 'filtered_zero' | 'error';
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export const StateBlock: React.FC<StateBlockProps> = ({
  state,
  title,
  description,
  onAction,
  actionLabel,
  className = '',
}) => {
  if (state === 'loading') {
    return (
      <div className={`p-8 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 animate-pulse ${className}`}>
        <div className="h-6 bg-slate-800/60 rounded-lg w-1/3"></div>
        <div className="h-4 bg-slate-800/40 rounded-lg w-2/3"></div>
        <div className="h-10 bg-slate-800/40 rounded-xl w-full"></div>
      </div>
    );
  }

  if (state === 'filtered_zero') {
    return (
      <div className={`p-10 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 ${className}`}>
        <h4 className="text-lg font-bold text-slate-100">{title || 'No matching results'}</h4>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{description || 'No records matched your search query or policy filters.'}</p>
        {onAction && (
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel || 'Clear Filters'}
          </Button>
        )}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={`p-8 rounded-2xl bg-rose-950/30 border border-rose-800/80 text-rose-200 space-y-4 ${className}`}>
        <h4 className="text-lg font-bold text-rose-100">{title || 'Telemetry Connection Failed'}</h4>
        <p className="text-sm text-rose-300 max-w-md">{description || 'RPC rate limit reached or network timed out. Retrying automatically.'}</p>
        {onAction && (
          <Button variant="danger" size="sm" onClick={onAction}>
            {actionLabel || 'Retry Connection'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-12 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 ${className}`}>
      <h4 className="text-lg font-bold text-slate-100">{title || 'No active positions yet'}</h4>
      <p className="text-sm text-slate-400 max-w-md mx-auto">{description || 'Register your AI trading agent or connect a wallet to begin monitoring risk.'}</p>
      {onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel || 'Get Started'}
        </Button>
      )}
    </div>
  );
};
