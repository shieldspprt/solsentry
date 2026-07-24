import { NavKey } from './NavIcons';

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard' },
  { key: 'positions', label: 'Positions', href: '/dashboard/positions' },
  { key: 'policies', label: 'Policies', href: '/dashboard/policies' },
  { key: 'agents', label: 'Agents', href: '/dashboard/agents' },
  { key: 'alerts', label: 'Alerts', href: '/dashboard/alerts' },
  { key: 'mcp', label: 'MCP Server', href: '/mcp' },
  { key: 'simulator' as any, label: 'Tx Simulator', href: '/dashboard/simulator' },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings' },
  { key: 'overview' as any, label: 'API Docs', href: '/docs' },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href);
}
