import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-10">
      <div>
        <h1 className="text-2xl font-light text-white tracking-tight uppercase">{title}</h1>
        {subtitle && <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="SEARCH..."
            className="w-48 pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-text-muted text-[10px] tracking-widest focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        <button className="relative p-2 text-text-muted hover:text-white transition-colors">
          <Bell className="w-5 h-5 font-light" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]"></span>
        </button>

        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-black font-bold text-xs shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          Z
        </div>
      </div>
    </header>
  );
}
