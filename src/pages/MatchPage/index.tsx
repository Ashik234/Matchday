import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMatchProfile } from '@/data/queries/useMatchProfile';
import { useTeams } from '@/data/queries';
import { MatchHero } from './MatchHero';
import { MatchTabs, MATCH_TABS, type MatchTabKey } from './MatchTabs';
import { MatchOverviewTab } from './tabs/MatchOverviewTab';
import { HeadToHeadTab } from './tabs/HeadToHeadTab';
import { RecentFormTab } from './tabs/RecentFormTab';
import { TopScorersTab } from './tabs/TopScorersTab';
import { SquadCompareTab } from './tabs/SquadCompareTab';
import { PreviousMeetingsTab } from './tabs/PreviousMeetingsTab';
import type { Match } from '@/data/types';

function parseHash(): MatchTabKey {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace('#', '') as MatchTabKey;
  return MATCH_TABS.some((t) => t.key === h) ? h : 'overview';
}

export default function MatchPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const profile = useMatchProfile(slug);
  const teams = useTeams();
  const [tab, setTab] = useState<MatchTabKey>(() => parseHash());

  useEffect(() => {
    const onHash = () => setTab(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onChangeTab = (k: MatchTabKey) => {
    setTab(k);
    window.history.replaceState(null, '', `#${k}`);
  };

  const homeTeam = teams.data?.find((t) => t.name === profile.match?.home.name);
  const awayTeam = teams.data?.find((t) => t.name === profile.match?.away.name);

  const homeFinished = useMemo(
    () =>
      profile.recentHome.filter(
        (m): m is Match => 'status' in m && m.status === 'finished',
      ),
    [profile.recentHome],
  );
  const awayFinished = useMemo(
    () =>
      profile.recentAway.filter(
        (m): m is Match => 'status' in m && m.status === 'finished',
      ),
    [profile.recentAway],
  );

  if (profile.isLoading) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-10" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (profile.notFound || !profile.match) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl text-text">Match not found</h1>
        <p className="text-text-dim">No fixture matches "{slug}".</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-full bg-gold text-bg-deep font-semibold">
          Back home
        </Link>
      </div>
    );
  }

  const { match, h2h, squadHome, squadAway, recentHome, recentAway, topScorersHome, topScorersAway } = profile;
  const homeCode = homeTeam?.id ?? match.home.countryCode.toUpperCase();
  const awayCode = awayTeam?.id ?? match.away.countryCode.toUpperCase();

  return (
    <>
      <MatchHero match={match} homeRank={homeTeam?.fifaRank} awayRank={awayTeam?.fifaRank} />
      <MatchTabs active={tab} onChange={onChangeTab} />
      <div className="max-w-container mx-auto px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`match-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`match-tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && (
              <MatchOverviewTab
                match={match}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeFinished={homeFinished}
                awayFinished={awayFinished}
              />
            )}
            {tab === 'h2h' && (
              <HeadToHeadTab
                homeName={match.home.name}
                awayName={match.away.name}
                homeCode={homeCode}
                h2h={h2h}
              />
            )}
            {tab === 'form' && (
              <RecentFormTab
                homeName={match.home.name}
                awayName={match.away.name}
                homeCode={homeCode}
                awayCode={awayCode}
                recentHome={recentHome}
                recentAway={recentAway}
              />
            )}
            {tab === 'scorers' && (
              <TopScorersTab
                homeName={match.home.name}
                awayName={match.away.name}
                scorersHome={topScorersHome}
                scorersAway={topScorersAway}
                squadHome={squadHome}
                squadAway={squadAway}
              />
            )}
            {tab === 'squad' && (
              <SquadCompareTab
                homeName={match.home.name}
                awayName={match.away.name}
                squadHome={squadHome}
                squadAway={squadAway}
              />
            )}
            {tab === 'history' && <PreviousMeetingsTab h2h={h2h} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
