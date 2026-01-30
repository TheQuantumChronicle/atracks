import { useState } from 'react';
import { Button } from '@/components/ui';
import { Save, Server, Key, Shield } from 'lucide-react';

export function Settings() {
  const [cap402Url, setCap402Url] = useState('https://cap402.com');
  const [atracksUrl, setAtracksUrl] = useState('https://api.atracks.xyz');
  const [notifications, setNotifications] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="relative z-10 min-h-screen p-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-light text-white tracking-tight uppercase">Settings</h1>
        <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] mt-1">Configure system parameters</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* API Configuration */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-4 h-4 text-white" />
            <h3 className="text-xs uppercase tracking-widest text-white font-medium">Endpoints</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">CAP-402 Router</label>
              <input
                type="text"
                value={cap402Url}
                onChange={(e) => setCap402Url(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">Atracks Server</label>
              <input
                type="text"
                value={atracksUrl}
                onChange={(e) => setAtracksUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-4 h-4 text-white" />
            <h3 className="text-xs uppercase tracking-widest text-white font-medium">Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">Inco FHE Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">Arcium MPC Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* System Prefs */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-4 h-4 text-white" />
            <h3 className="text-xs uppercase tracking-widest text-white font-medium">Preferences</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium uppercase tracking-tight">Push Notifications</p>
                <p className="text-[10px] text-text-muted mt-0.5">Alerts for agent performance events</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
                  notifications ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all duration-300 ${
                    notifications ? 'translate-x-6 bg-black' : 'translate-x-0.5 bg-white/40'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium uppercase tracking-tight">Auto-Verify Reputation</p>
                <p className="text-[10px] text-text-muted mt-0.5">Trigger MPC verification after each trade</p>
              </div>
              <button
                onClick={() => setAutoVerify(!autoVerify)}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
                  autoVerify ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all duration-300 ${
                    autoVerify ? 'translate-x-6 bg-black' : 'translate-x-0.5 bg-white/40'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} size="lg" className="px-10">
            {saved ? 'Saved' : (
              <>
                <Save className="w-4 h-4" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
