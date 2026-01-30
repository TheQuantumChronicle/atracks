import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Sidebar />
      <main className="ml-16 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <div className="ml-16 flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
}
