const DAY_OPTIONS = [
  { day: 1, label: 'T2' },
  { day: 2, label: 'T3' },
  { day: 3, label: 'T4' },
  { day: 4, label: 'T5' },
  { day: 5, label: 'T6' },
  { day: 6, label: 'T7' },
  { day: 0, label: 'CN' },
];

interface DeliveryDayToggleProps {
  value: number[];
  onChange: (updater: (prev: number[]) => number[]) => void;
  className?: string;
}

export function DeliveryDayToggle({ value, onChange, className }: DeliveryDayToggleProps) {
  const toggle = (day: number) => {
    onChange((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className || ''}`}>
      {DAY_OPTIONS.map(({ day, label }) => {
        const active = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            className={`w-11 h-11 rounded-xl border-2 text-xs font-black transition-all ${
              active
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
