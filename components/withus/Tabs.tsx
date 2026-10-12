"use client";

type Tab = { id: string; label: string; count?: number | string };

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null ? <span className="n">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** 알약 모양 필터 버튼 묶음 */
export function Pills({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="pills">
      {items.map((i) => (
        <button key={i.id} aria-pressed={i.id === value} onClick={() => onChange(i.id)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}
