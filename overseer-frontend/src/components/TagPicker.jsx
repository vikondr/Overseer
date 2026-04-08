const PALETTE = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399'];

export const CREATIVE_TAGS = [
  'UI Design', 'UX Design', 'Branding', 'Visual Identity', 'Typography',
  'Illustration', 'Motion Graphics', '3D Art', 'Web Design', 'Logo Design',
  'Photography', 'Concept Art', 'Packaging', 'Icon Design', 'Product Design',
  'Print', 'Art Direction', 'Figma', 'Case Study', 'Editorial',
];

/**
 * TagPicker — clickable pill grid for selecting from a predefined list.
 *
 * Props:
 *   selected  — string[]  currently selected tags
 *   onChange  — (string[]) => void
 *   options   — string[]  (defaults to CREATIVE_TAGS)
 *   max       — number    max selectable (default unlimited)
 */
export default function TagPicker({ selected = [], onChange, options = CREATIVE_TAGS, max }) {
  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag, i) => {
        const active = selected.includes(tag);
        const color = PALETTE[i % PALETTE.length];
        const disabled = !active && max != null && selected.length >= max;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            disabled={disabled}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={active ? {
              color,
              borderColor: `${color}55`,
              background: `${color}18`,
            } : {
              color: '#64748b',
              borderColor: '#1e293b',
              background: 'transparent',
              opacity: disabled ? 0.35 : 1,
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}