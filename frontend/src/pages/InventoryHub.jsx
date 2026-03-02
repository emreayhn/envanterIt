/**
 * Page: InventoryHub — Envanter kategori seçim sayfası.
 * Hardcoded (Bilgisayarlar, Kiosklar, Yazıcılar) + dinamik kategoriler.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Printer, Laptop, Package, Plus, X, Check } from 'lucide-react';
import { getCategories, createCategory, deleteCategory as apiDeleteCategory } from '../services/api';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';

/* ── Hardcoded categories ──────────────────────────── */
const hardcoded = [
    {
        key: 'computers', label: 'Bilgisayarlar', icon: Monitor,
        description: 'Dizüstü ve masaüstü bilgisayarlar',
        path: '/inventory/computers',
        color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    },
    {
        key: 'kiosks', label: 'Kiosklar', icon: Laptop,
        description: 'Self-servis kiosk cihazları',
        path: '/inventory/kiosks',
        color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    },
    {
        key: 'printers', label: 'Yazıcılar', icon: Printer,
        description: 'Lazer ve mürekkep püskürtmeli yazıcılar',
        path: '/inventory/printers',
        color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
];

/* ── Column choices ────────────────────────────────── */
const COLUMN_OPTIONS = [
    { key: 'name', label: 'Ad' },
    { key: 'brand', label: 'Marka' },
    { key: 'model', label: 'Model' },
    { key: 'serial_no', label: 'Seri No', locked: true },
    { key: 'ram', label: 'RAM' },
    { key: 'cpu', label: 'CPU' },
    { key: 'wifi_mac', label: 'Wi-Fi MAC' },
    { key: 'ethernet_mac', label: 'Ethernet MAC' },
    { key: 'tesis', label: 'Tesis' },
    { key: 'lokasyon', label: 'Lokasyon' },
];

/* ── Auto‑color palette ────────────────────────────── */
const COLORS = ['#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#a855f7', '#ef4444'];

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function InventoryHub() {
    const navigate = useNavigate();
    const [dynamicCats, setDynamicCats] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedCols, setSelectedCols] = useState(['serial_no']);
    const [creating, setCreating] = useState(false);
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    const fetchCats = async () => {
        try {
            const { data } = await getCategories();
            setDynamicCats(data);
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchCats(); }, []);

    const toggleCol = (key) => {
        if (key === 'serial_no') return; // always locked
        setSelectedCols((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const slug = slugify(newName.trim());
            const color = COLORS[(hardcoded.length + dynamicCats.length) % COLORS.length];
            await createCategory({ name: newName.trim(), slug, columns: selectedCols, color });
            setShowCreate(false);
            setNewName('');
            setSelectedCols(['serial_no']);
            fetchCats();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Kategori oluşturulurken hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', onConfirm: closeModal });
        } finally { setCreating(false); }
    };

    const handleDeleteCat = (cat) => {
        setModal({
            open: true,
            title: 'Kategori Sil',
            message: `"${cat.name}" kategorisini ve tüm kayıtlarını silmek istediğinize emin misiniz?`,
            type: 'confirm',
            onConfirm: async () => {
                closeModal();
                try { await apiDeleteCategory(cat.id); fetchCats(); }
                catch (err) { setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Silme başarısız.', type: 'error', onConfirm: closeModal }); }
            },
        });
    };

    return (
        <div>
            <AppModal open={modal.open} title={modal.title} message={modal.message} type={modal.type} onConfirm={modal.onConfirm} onCancel={closeModal} />

            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2 className="page-title">
                        <span className="page-title-icon"><Package style={{ width: 18, height: 18 }} /></span>
                        Envanter
                    </h2>
                    <p className="page-subtitle">Kategori seçerek envanter yönetimine başlayın</p>
                </div>
                <Button icon={showCreate ? X : Plus} onClick={() => setShowCreate((p) => !p)} variant={showCreate ? 'ghost' : undefined}>
                    {showCreate ? 'İptal' : 'Yeni Kategori'}
                </Button>
            </div>

            {/* ── Create Category Form ──────────────────── */}
            {showCreate && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }} />
                        Yeni Envanter Kategorisi Oluştur
                    </h3>

                    <div style={{ marginBottom: 24 }}>
                        <label className="form-label">Kategori Adı</label>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="ör: Monitörler, Tabletler, El Terminalleri..."
                            className="input"
                            style={{ maxWidth: 400 }}
                        />
                        {newName.trim() && (
                            <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                                Slug: <code style={{ color: '#6366f1' }}>{slugify(newName.trim())}</code>
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label className="form-label">Kolonlar</label>
                        <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Bu kategorideki cihazlar için hangi alanlar olsun?</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {COLUMN_OPTIONS.map((col) => {
                                const isSelected = selectedCols.includes(col.key);
                                const isLocked = col.locked;
                                return (
                                    <button
                                        key={col.key}
                                        type="button"
                                        onClick={() => toggleCol(col.key)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 10,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.08)'}`,
                                            background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(8,12,28,0.5)',
                                            color: isSelected ? '#a5b4fc' : '#64748b',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {isSelected && <Check style={{ width: 14, height: 14 }} />}
                                        {col.label}
                                        {isLocked && <span style={{ fontSize: 10, opacity: 0.6 }}>(zorunlu)</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); setSelectedCols(['serial_no']); }}>İptal</Button>
                        <Button icon={Plus} onClick={handleCreate} loading={creating} disabled={!newName.trim() || selectedCols.length < 2}>Kategori Oluştur</Button>
                    </div>
                </div>
            )}

            {/* ── Category Grid ──────────────────────────── */}
            <div className="category-grid">
                {/* Hardcoded */}
                {hardcoded.map((cat) => (
                    <button
                        key={cat.key}
                        className="category-card"
                        onClick={() => navigate(cat.path)}
                        style={{ '--cat-color': cat.color, '--cat-gradient': cat.gradient }}
                    >
                        <div className="category-card__orb" />
                        <div className="category-card__icon">
                            <cat.icon style={{ width: 28, height: 28, color: 'white' }} />
                        </div>
                        <div className="category-card__body">
                            <h3 className="category-card__title">{cat.label}</h3>
                            <p className="category-card__desc">{cat.description}</p>
                        </div>
                        <span className="category-card__badge category-card__badge--active">Aktif</span>
                    </button>
                ))}

                {/* Dynamic */}
                {dynamicCats.map((cat) => (
                    <button
                        key={cat.slug}
                        className="category-card"
                        onClick={() => navigate(`/inventory/dynamic/${cat.slug}`)}
                        style={{ '--cat-color': cat.color || '#6366f1', '--cat-gradient': `linear-gradient(135deg, ${cat.color || '#6366f1'}, ${cat.color || '#6366f1'}dd)` }}
                    >
                        <div className="category-card__orb" />
                        <div className="category-card__icon">
                            <Package style={{ width: 28, height: 28, color: 'white' }} />
                        </div>
                        <div className="category-card__body">
                            <h3 className="category-card__title">{cat.name}</h3>
                            <p className="category-card__desc">{cat.columns.length} alan · Dinamik kategori</p>
                        </div>
                        <span className="category-card__badge category-card__badge--active">Aktif</span>
                        {/* Delete button */}
                        <span
                            onClick={(e) => { e.stopPropagation(); handleDeleteCat(cat); }}
                            style={{
                                position: 'absolute', top: 10, right: 10, width: 24, height: 24,
                                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 14,
                                cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s',
                            }}
                            className="cat-delete-btn"
                            title="Kategoriyi sil"
                        >×</span>
                    </button>
                ))}
            </div>

            {/* Hover style for delete button */}
            <style>{`
                .category-card:hover .cat-delete-btn { opacity: 1 !important; }
            `}</style>
        </div>
    );
}
