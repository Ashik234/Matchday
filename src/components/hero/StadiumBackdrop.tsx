export function StadiumBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(31,90,31,0.5) 0%, transparent 70%),' +
            'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,255,255,0.08) 0%, transparent 60%),' +
            'linear-gradient(180deg, #0A1428 0%, #0F1A2E 40%, #0D2818 100%)',
        }}
      />
      <div
        className="absolute left-[10%] right-[10%] top-[8%] h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          filter: 'blur(6px)',
        }}
      />
      <div
        className="absolute left-[-10%] right-[-10%] bottom-[38%] h-[140px]"
        style={{
          background: 'linear-gradient(180deg, #1A2540 0%, #0A1020 100%)',
          borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          boxShadow: 'inset 0 20px 40px rgba(0,0,0,0.6)',
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-[38%]"
        style={{
          background: 'linear-gradient(180deg, #1F5A1F 0%, #0D2818 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 motion-safe:animate-[floodPulse_4s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(ellipse 50% 30% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)',
        }}
      />
    </div>
  );
}
