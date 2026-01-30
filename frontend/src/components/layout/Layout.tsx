import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar />
      <main className="ml-16 flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <div className="ml-16 fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </div>
  );
}
