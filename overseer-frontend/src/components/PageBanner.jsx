export default function PageBanner({ children, className = '' }) {
  return (
    <div className={`relative border-b border-slate-800/60 overflow-hidden ${className}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.4,
          }}
        />
        <div style={{ position: 'absolute', top: '-40%', left: '-5%', width: '40vw', height: '40vw', maxWidth: 400, maxHeight: 400,
          background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300,
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '5%', width: '30vw', height: '30vw', maxWidth: 320, maxHeight: 320,
          background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 65%)' }} />
      </div>
      {children}
    </div>
  );
}
