import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App';
import TeamPage from '@/pages/TeamPage';
import { Layout } from '@/pages/Layout';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/team/:slug"
          element={
            <Layout>
              <TeamPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
