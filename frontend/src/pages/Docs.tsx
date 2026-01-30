import { motion } from 'framer-motion';
import { Book, ExternalLink, Zap, FileJson, ArrowUpRight } from 'lucide-react';

export function Docs() {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBaseUrl = isDev ? 'http://localhost:3002' : (import.meta.env.VITE_API_URL || 'https://api.atracks.xyz');

  const openSwagger = () => {
    window.open(`${apiBaseUrl}/docs`, '_blank', 'noopener,noreferrer');
  };

  const openOpenAPI = () => {
    window.open(`${apiBaseUrl}/openapi.json`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        {/* Animated icon */}
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-indigo-500/20 border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
            <Book className="w-7 h-7 text-accent" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-2xl font-light text-white mb-2"
        >
          API Documentation
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-text-muted text-sm mb-8"
        >
          Full interactive docs open in a new tab
        </motion.p>

        {/* Main CTA - Swagger */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={openSwagger}
          className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-accent to-indigo-500 p-[1px] mb-4 cursor-pointer"
        >
          <div className="relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-black/80 group-hover:bg-black/60 transition-colors">
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-white font-medium">Open Swagger UI</span>
            <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </motion.button>

        {/* Secondary - OpenAPI */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          onClick={openOpenAPI}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer"
        >
          <FileJson className="w-4 h-4 text-text-muted" />
          <span className="text-text-secondary text-sm">Download OpenAPI Spec</span>
          <ExternalLink className="w-3 h-3 text-text-muted" />
        </motion.button>

        {/* Base URL hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 pt-6 border-t border-white/[0.05]"
        >
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Base URL</p>
          <code className="text-accent text-xs font-mono">{apiBaseUrl}</code>
        </motion.div>
      </motion.div>
    </div>
  );
}
