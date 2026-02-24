export default function BackgroundEffects() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base dark background */}
      <div className="absolute inset-0 animated-gradient" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      {/* Neon green ambient glow — top center */}
      <div 
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-3xl opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse, rgba(0,255,156,0.2), transparent 70%)' }}
      />
      
      {/* Neon green ambient glow — bottom left */}
      <div className="absolute bottom-0 -left-20 w-96 h-96 bg-neon-green/[0.03] rounded-full blur-3xl" />
      
      {/* Dim secondary glow — right */}
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-neon-green/[0.015] rounded-full blur-3xl" />
      
      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,2,2,0.8) 100%)'
        }}
      />
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px'
        }}
      />
    </div>
  );
}
