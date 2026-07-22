import React, { InputHTMLAttributes, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  id: providedId,
  autoComplete = 'off',
  autoCorrect = 'off',
  autoCapitalize = 'none',
  spellCheck = false,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col gap-2 ${widthStyle}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-200">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        className={`w-full px-4 py-3 text-[15px] min-h-[48px] bg-black/30 border rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-rose-500 focus:ring-rose-500'
            : 'border-[var(--color-border)] focus:border-cyan-400 focus:ring-cyan-500/25'
        } ${className}`}
        {...props}
      />
      {error && (
        <span id={errorId} className="text-xs text-rose-400 font-semibold break-words">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className="text-xs text-slate-300 break-words">
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
