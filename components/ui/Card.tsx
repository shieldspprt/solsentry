import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  padding = 'md',
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4 sm:p-5',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div className={`glass-card rounded-3xl overflow-hidden ${paddingStyles[padding]} ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            {title && <h3 className="text-lg sm:text-xl font-bold text-slate-50 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-[13.5px] sm:text-sm text-slate-400 mt-1 leading-snug">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
