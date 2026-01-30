import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { Dashboard, Agents, AgentDetail, Leaderboard, Proofs, Protocol, Docs } from '@/pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/:agentId" element={<AgentDetail />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="proofs" element={<Proofs />} />
          <Route path="protocol" element={<Protocol />} />
          <Route path="docs" element={<Docs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
