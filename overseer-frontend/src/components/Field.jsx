export default function Field({ label, hint, value, onChange, type = 'text', multiline = false }) {
  const inputClass =
    'w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm transition-colors';
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {hint && <span className="text-slate-600 font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          maxLength={500}
          value={value}
          onChange={onChange}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input type={type} value={value} onChange={onChange} className={inputClass} />
      )}
    </div>
  );
}
