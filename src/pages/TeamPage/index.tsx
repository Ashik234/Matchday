import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTeamProfile } from '@/data/queries/useTeamProfile';
import { TeamHero } from './TeamHero';
import { TeamTabs, type TabKey, TABS } from './TeamTabs';
import { OverviewTab } from './tabs/OverviewTab';
import { SquadTab } from './tabs/SquadTab';
import { StatsTab } from './tabs/StatsTab';
import { MatchesTab } from './tabs/MatchesTab';
import { JourneyTab } from './tabs/JourneyTab';
import { StarPlayersTab } from './tabs/StarPlayersTab';
import { Skeleton } from '@/components/ui/Skeleton';

function parseHash(): TabKey {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace('#', '') as TabKey;
  return TABS.some((t) => t.key === h) ? h : 'overview';
}

export default function TeamPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const profile = useTeamProfile(slug);
  const [tab, setTab] = useState<TabKey>(() => parseHash());

  useEffect(() => {
    const onHash = () => setTab(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onChangeTab = (k: TabKey) => {
    setTab(k);
    window.history.replaceState(null, '', `#${k}`);
  };

  if (profile.isLoading) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-10" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (profile.notFound || !profile.team) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl text-text">Team not found</h1>
        <p className="text-text-dim">No World Cup team matches “{slug}”.</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-full bg-gold text-bg-deep font-semibold">
          Back home
        </Link>
      </div>
    );
  }

  const { team, matches, group, bracketNodes, squad } = profile;

  return (
    <>
      <TeamHero team={team} matches={matches} group={group} />
      <TeamTabs active={tab} onChange={onChangeTab} />
      <div className="max-w-container mx-auto px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && <OverviewTab team={team} matches={matches} />}
            {tab === 'squad' && <SquadTab squad={squad} countryCode={team.countryCode} />}
            {tab === 'stats' && <StatsTab team={team} matches={matches} group={group} />}
            {tab === 'matches' && <MatchesTab team={team} matches={matches} />}
            {tab === 'journey' && (
              <JourneyTab
                team={team}
                matches={matches}
                group={group}
                bracketNodes={bracketNodes}
              />
            )}
            {tab === 'stars' && <StarPlayersTab team={team} squad={squad} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
