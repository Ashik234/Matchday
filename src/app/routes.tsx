import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App';
import TeamPage from '@/pages/TeamPage';
import MatchPage from '@/pages/MatchPage';
import CardEffectsPreview from '@/pages/CardEffectsPreview';
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
        <Route
          path="/match/:slug"
          element={
            <Layout>
              <MatchPage />
            </Layout>
          }
        />
        <Route
          path="/preview/card-effects"
          element={
            <Layout>
              <CardEffectsPreview />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
