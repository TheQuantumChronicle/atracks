export function Footer() {
  return (
    <footer className="relative z-10 w-full py-4 px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-6">
        <div className="flex items-center gap-6">
          <a href="https://noir-lang.org" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
            <img src="/noir.png" alt="Noir" className="h-[18px] object-contain" />
          </a>
          <a href="https://inco.network" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
            <img src="/inco.png" alt="Inco" className="h-[18px] object-contain" />
          </a>
          <a href="https://arcium.com" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
            <img src="/arcium.svg" alt="Arcium" className="h-[18px] object-contain" />
          </a>
        </div>
        <span className="text-white/10">|</span>
        <a href="https://intym.xyz" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
          <img src="/intymlogo.png" alt="Intym Labs" className="h-[27px]" />
        </a>
      </div>
    </footer>
  );
}
