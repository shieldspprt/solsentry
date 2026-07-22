import { AlertSeverity, AlertType, PositionRecord, AgentDecisionAction } from '../../../lib/types';

export interface PositionHealthEvaluation {
  positionId: string;
  healthFactor: number | null;
  liquidationPrice: number | null;
  currentPrice: number | null;
  isLiquidationRisk: boolean;
  alertRequired: boolean;
  alertType?: AlertType;
  alertSeverity?: AlertSeverity;
  alertMessage?: string;
  agentAction: AgentDecisionAction;
  actionReason: string;
}

export function evaluatePositionHealth(position: PositionRecord): PositionHealthEvaluation {
  const { id, position_type, current_price, liquidation_price, health_factor } = position;

  let isLiquidationRisk = false;
  let alertRequired = false;
  let alertType: AlertType | undefined;
  let alertSeverity: AlertSeverity | undefined;
  let alertMessage: string | undefined;
  let agentAction: AgentDecisionAction = 'HOLD';
  let actionReason = 'Position parameters operate within normal safety bounds.';

  if (position_type === 'borrow' || position_type === 'perp') {
    if (health_factor !== null && health_factor !== undefined) {
      if (health_factor <= 1.08) {
        isLiquidationRisk = true;
        alertRequired = true;
        alertType = 'liquidation_risk';
        alertSeverity = 'critical';
        alertMessage = `CRITICAL: Position ${id} health factor is ${health_factor.toFixed(2)}. Liquidation is imminent!`;
        agentAction = 'SELL_POSITION';
        actionReason = 'Health factor is dangerously close to 1.0. Liquidate or exit immediately to preserve capital.';
      } else if (health_factor <= 1.25) {
        alertRequired = true;
        alertType = 'health_factor_low';
        alertSeverity = 'warning';
        alertMessage = `WARNING: Position ${id} health factor is ${health_factor.toFixed(2)} (below target 1.25 threshold)`;
        agentAction = 'CHANGE_POSITION';
        actionReason = 'Health factor degraded. De-leveraging or adding collateral is required.';
      } else if (health_factor >= 1.8) {
        agentAction = 'TAKE_POSITION';
        actionReason = 'High health factor buffer. Capacity available for position expansion.';
      }
    }

    if (current_price && liquidation_price) {
      const priceDistancePct = Math.abs((current_price - liquidation_price) / current_price) * 100;
      if (priceDistancePct <= 5) {
        isLiquidationRisk = true;
        alertRequired = true;
        alertType = 'liquidation_risk';
        alertSeverity = 'critical';
        alertMessage = `CRITICAL: Current price $${current_price} is within 5% of liquidation price $${liquidation_price}`;
        agentAction = 'SELL_POSITION';
        actionReason = 'Asset price is within 5% of liquidation price. Exit immediately.';
      }
    }
  }

  return {
    positionId: id,
    healthFactor: health_factor,
    liquidationPrice: liquidation_price,
    currentPrice: current_price,
    isLiquidationRisk,
    alertRequired,
    alertType,
    alertSeverity,
    alertMessage,
    agentAction,
    actionReason,
  };
}
