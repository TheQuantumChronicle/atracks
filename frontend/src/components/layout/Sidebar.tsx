import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Shield,
  Zap,
  Book,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/proofs', icon: Shield, label: 'Proofs' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { to: '/protocol', icon: Zap, label: 'How It Works' },
  { to: '/docs', icon: Book, label: 'API Docs' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 hover:w-48 bg-black/40 backdrop-blur-xl border-r border-white/[0.03] flex flex-col transition-all duration-300 group z-50">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center group-hover:justify-start group-hover:px-4 transition-all duration-300">
        <img 
          src="/atrackslogo.png" 
          alt="ATRACKS" 
          className="w-8 h-8 rounded-lg flex-shrink-0 object-contain"
        />
        <span className="text-white font-medium opacity-0 group-hover:opacity-100 group-hover:ml-3 transition-all duration-300 whitespace-nowrap tracking-tight w-0 group-hover:w-auto overflow-hidden">
          Atracks
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative group/item',
                isActive
                  ? 'bg-white/[0.08] text-white shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                  : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
              )
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs uppercase tracking-widest font-medium">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
