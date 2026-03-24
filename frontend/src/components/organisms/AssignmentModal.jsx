/**
 * Organism: AssignmentModal — cihaz türü seçimi + personel seçimi.
 */
import { useState, useEffect } from 'react';
import { X, ClipboardList, Monitor, Server, Printer, Package } from 'lucide-react';
import { getEmployees, createAssignment, getAvailableItems, getCategories } from '../../services/api';
import SearchableSelect from '../molecules/SearchableSelect';

const FIXED_TYPES = [
    { key: 'computer', label: 'Bilgisayar', Icon: Monitor },
    { key: 'kiosk',    label: 'Kiosk',      Icon: Server  },
    { key: 'printer',  label: 'Yazıcı',     Icon: Printer },
];

export default function AssignmentModal({ isOpen, onClose, onSuccess, defaultItemType = 'computer', defaultCategoryId = null, locked = false }) {
    const [itemType, setItemType]         = useState(defaultItemType);
    const [categoryId, setCategoryId]     = useState(defaultCategoryId); // dinamik kategori seçimi için
    const [categories, setCategories]     = useState([]);
    const [allCategoryItems, setAllCategoryItems] = useState([]);
    const [items, setItems]               = useState([]);
    const [employees, setEmployees]       = useState([]);
    const [itemId, setItemId]             = useState('');
    const [employeeId, setEmployeeId]     = useState('');
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');

    useEffect(() => {
        if (isOpen) {
            setItemId('');
            setEmployeeId('');
            setError('');
            setItemType(defaultItemType || 'computer');
            setCategoryId(defaultCategoryId || null);
            getEmployees().then((res) => setEmployees(res.data)).catch(() => setEmployees([]));
            getCategories().then((res) => setCategories(res.data)).catch(() => setCategories([]));
        }
    }, [isOpen]);

    // Sabit türler değişince listeyi çek
    useEffect(() => {
        if (!isOpen || itemType === 'category_item') return;
        setItemId('');
        setError('');
        getAvailableItems(itemType)
            .then((res) => setItems(res.data))
            .catch(() => setItems([]));
    }, [isOpen, itemType]);

    // Dinamik kategori seçilince tüm category_item'ları çek ve filtrele
    useEffect(() => {
        if (!isOpen || itemType !== 'category_item') return;
        setItemId('');
        setError('');
        getAvailableItems('category_item')
            .then((res) => {
                setAllCategoryItems(res.data);
                const filtered = categoryId ? res.data.filter((i) => i.category_id === categoryId) : res.data;
                setItems(filtered);
            })
            .catch(() => { setAllCategoryItems([]); setItems([]); });
    }, [isOpen, itemType, categoryId]);

    const handleSelectCategory = (cat) => {
        setItemType('category_item');
        setCategoryId(cat.id);
        setItemId('');
        setError('');
        // allCategoryItems zaten doluysa yeniden fetch etme, sadece filtrele
        if (allCategoryItems.length > 0) {
            setItems(allCategoryItems.filter((i) => i.category_id === cat.id));
        }
    };

    const itemOptions = items.map((i) => ({
        value: String(i.id),
        label: i.label,
        sub: i.serial,
    }));

    const employeeOptions = employees.map((e) => ({
        value: String(e.id),
        label: e.full_name,
        sub: e.department || '',
    }));

    const handleSubmit = async () => {
        if (!itemId || !employeeId) {
            setError('Lütfen cihaz ve personel seçin.');
            return;
        }
        const fkKey = itemType === 'category_item' ? 'item_id' : `${itemType}_id`;
        setLoading(true);
        setError('');
        try {
            await createAssignment({
                [fkKey]: Number(itemId),
                employee_id: Number(employeeId),
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedType = itemType === 'category_item'
        ? { label: categories.find((c) => c.id === categoryId)?.name || 'Envanter Kalemi' }
        : FIXED_TYPES.find((t) => t.key === itemType);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#111827', border: '1px solid #1e293b',
                    borderRadius: 16, padding: 32, width: '100%', maxWidth: 440,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(99,102,241,0.15)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ClipboardList style={{ width: 20, height: 20, color: '#818cf8' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Zimmet Ata</h2>
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                            {itemType === 'category_item' && categoryId
                                ? `${categories.find((c) => c.id === categoryId)?.name || 'Envanter'} → Personel`
                                : 'Cihaz → Personel'}
                        </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 8 }}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Cihaz türü sekmeleri — locked modda gizli */}
                {locked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>{selectedType?.label}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>zimmetleri görüntüleniyor</span>
                    </div>
                )}
                {!locked && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {/* Sabit türler */}
                    {FIXED_TYPES.map(({ key, label, Icon }) => {
                        const active = itemType === key;
                        return (
                            <button
                                key={key}
                                onClick={() => { setItemType(key); setCategoryId(null); }}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    gap: 4, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                                    color: active ? '#818cf8' : '#475569',
                                    transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                <Icon style={{ width: 16, height: 16 }} />
                                <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
                            </button>
                        );
                    })}
                    {/* Dinamik kategoriler */}
                    {categories.map((cat) => {
                        const active = itemType === 'category_item' && categoryId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleSelectCategory(cat)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    gap: 4, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                    border: active ? `1px solid ${cat.color || '#6366f1'}66` : '1px solid rgba(255,255,255,0.05)',
                                    background: active ? `${cat.color || '#6366f1'}18` : 'rgba(255,255,255,0.02)',
                                    color: active ? (cat.color || '#818cf8') : '#475569',
                                    transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                <Package style={{ width: 16, height: 16 }} />
                                <span style={{ fontSize: 10, fontWeight: 600 }}>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>}

                {error && (
                    <div style={{
                        padding: '10px 14px', marginBottom: 16, borderRadius: 8,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                {/* Cihaz seç */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                        {selectedType?.label} (Stokta)
                    </label>
                    <SearchableSelect
                        options={itemOptions}
                        value={itemId}
                        onChange={(v) => { setItemId(v); setError(''); }}
                        placeholder={`${selectedType?.label} ara veya seç...`}
                    />
                    {items.length === 0 && (
                        <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>Stokta {selectedType?.label.toLowerCase()} yok.</p>
                    )}
                </div>

                {/* Personel seç */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                        Personel
                    </label>
                    <SearchableSelect
                        options={employeeOptions}
                        value={employeeId}
                        onChange={(v) => { setEmployeeId(v); setError(''); }}
                        placeholder="Personel ara veya seç..."
                    />
                    {employees.length === 0 && (
                        <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>Personel yok.</p>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', fontSize: 13, fontWeight: 600,
                            background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b',
                            borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            padding: '10px 24px', fontSize: 13, fontWeight: 600,
                            background: loading ? '#374151' : '#6366f1', color: 'white',
                            border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
                            fontFamily: 'Inter, sans-serif', opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Kaydediliyor...' : 'Zimmet Ata'}
                    </button>
                </div>
            </div>
        </div>
    );
}
