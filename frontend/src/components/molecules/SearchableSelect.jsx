/**
 * Molecule: SearchableSelect — type-to-filter combobox.
 * Props: options=[{value, label, sub?}], value, onChange, placeholder
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Seçin...' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const selected = options.find((o) => String(o.value) === String(value));
    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
    );

    const handleSelect = (val) => {
        onChange(String(val));
        setOpen(false);
        setQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Trigger */}
            <div
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', fontSize: 14, color: selected ? '#e2e8f0' : '#475569',
                    background: '#0f172a', border: `1px solid ${open ? 'rgba(99,102,241,0.35)' : '#1e293b'}`,
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s',
                    boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {selected && (
                        <button
                            onClick={handleClear}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }}
                        >
                            <X style={{ width: 14, height: 14 }} />
                        </button>
                    )}
                    <ChevronDown style={{ width: 16, height: 16, color: '#475569', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: '#111827', border: '1px solid #1e293b', borderRadius: 12,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 50,
                    maxHeight: 280, display: 'flex', flexDirection: 'column',
                    animation: 'pageSlide 0.15s ease-out',
                }}>
                    {/* Search input */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b' }}>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#334155' }} />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ara..."
                                style={{
                                    width: '100%', padding: '8px 10px 8px 32px', fontSize: 13,
                                    color: '#e2e8f0', background: '#0f172a', border: '1px solid #1e293b',
                                    borderRadius: 8, outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '16px 14px', color: '#475569', fontSize: 13, textAlign: 'center' }}>
                                Sonuç bulunamadı
                            </div>
                        ) : (
                            filtered.map((opt) => {
                                const isSelected = String(opt.value) === String(value);
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        style={{
                                            padding: '10px 14px', cursor: 'pointer',
                                            backgroundColor: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                                            borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.04)'; }}
                                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <p style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? '#a5b4fc' : '#e2e8f0', margin: 0 }}>
                                            {opt.label}
                                        </p>
                                        {opt.sub && (
                                            <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0', fontFamily: 'monospace' }}>{opt.sub}</p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
