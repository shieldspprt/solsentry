import { AlertRecord } from './types';

export const DEFAULT_SOLANA_ALERTS: AlertRecord[] = [
  {
    id: 'alt_01',
    agent_id: 'ag_sol_kit_02',
    user_id: 'user_01',
    position_id: 'pos-drift-sol-02',
    alert_type: 'liquidation_risk',
    severity: 'warning',
    message: 'Drift SOL-PERP position health factor dropped to 1.12. Automatic deleveraging recommended.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'alt_02',
    agent_id: 'ag_degen_pump_03',
    user_id: 'user_01',
    position_id: 'pos-pumpfun-bc-04',
    alert_type: 'bonding_curve_dump',
    severity: 'info',
    message: 'Pump.fun bonding curve reached 92% completion. Token graduation to Raydium imminent.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'alt_03',
    agent_id: 'ag_eliza_sol_01',
    user_id: 'user_01',
    position_id: 'pos-kamino-sol-01',
    alert_type: 'health_factor_low',
    severity: 'info',
    message: 'Kamino SOL collateral pool utilization increased to 52.4%. Position operating normally.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];
