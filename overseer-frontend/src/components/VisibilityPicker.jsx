const OPTIONS = [
  { value: 'PUBLIC',   label: 'Public',    desc: 'Anyone can see this project',           color: '#34d399' },
  { value: 'UNLISTED', label: 'Unlisted',  desc: 'Only people with the link can see it',  color: '#f472b6' },
  { value: 'PRIVATE',  label: 'Private',   desc: 'Only you can see this project',          color: '#60a5fa' },
];

export default function VisibilityPicker({ value, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {OPTIONS.map(({ value: v, label, desc, color }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 text-left px-4 py-3 rounded-xl border transition-all"
            style={
              active
                ? { borderColor: `${color}60`, background: `${color}10`, color }
                : { borderColor: '#334155', background: 'transparent', color: '#64748b' }
            }
          >
            <div className="font-medium text-sm">{label}</div>
            <div className="text-xs mt-0.5 opacity-70">{desc}</div>
          </button>
        );
      })}
    </div>
  );
}
