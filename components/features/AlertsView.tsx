'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertRecord } from '../../lib/types';
import { formatDate } from '../../lib/formatters';

export interface AlertsViewProps {
  alerts?: AlertRecord[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts = [] }) => {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Alerts</h2>
        <p className="text-sm text-slate-300 mt-1">Real time feed of position risks and policy triggers</p>
      </div>

      {alerts.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <p className="text-base font-bold text-slate-200">All Systems Clear</p>
          <p className="text-sm text-slate-400 mt-1">No active position warnings or protocol exploits reported.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} padding="md" className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'high' : 'info'}>
                    {alert.alert_type}
                  </Badge>
                  <span className="text-xs text-slate-300 font-semibold">{formatDate(alert.created_at)}</span>
                </div>
                <p className="text-base font-semibold text-slate-100">{alert.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
