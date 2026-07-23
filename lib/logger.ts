type LogLevel = 'info' | 'warn' | 'error';

function formatLog(level: LogLevel, event: string, meta: Record<string, unknown> = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => {
    console.log(formatLog('info', event, meta));
  },
  warn: (event: string, meta?: Record<string, unknown>) => {
    console.warn(formatLog('warn', event, meta));
  },
  error: (event: string, meta?: Record<string, unknown>) => {
    console.error(formatLog('error', event, meta));
  },
};
