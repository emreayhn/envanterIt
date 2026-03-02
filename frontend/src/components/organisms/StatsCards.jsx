/**
 * Organism: StatsCards — neon-bordered cards with dynamic category support.
 */
import { Monitor, AlertTriangle, Users, User, Package, KeyRound, Tv, Printer, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fixedCards = [
    {
        key: 'total', label: 'TOPLAM BİLGİSAYAR', icon: Monitor,
        color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)',
        glow: 'rgba(6,182,212,0.12)', field: 'total_computers', sub: 'Tümü',
    },
    {
        key: 'stock', label: 'STOK CİHAZLAR', icon: Package,
        color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',
        glow: 'rgba(16,185,129,0.12)', field: 'stock_computers', sub: 'Kullanıma hazır',
    },
    {
        key: 'assigned', label: 'ZİMMETLİ', icon: User,
        color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)',
        glow: 'rgba(139,92,246,0.12)', field: 'assigned_computers', sub: 'Aktif zimmet',
    },
    {
        key: 'faulty', label: 'ARIZALI', icon: AlertTriangle,
        color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
        glow: 'rgba(239,68,68,0.12)', field: 'faulty_computers', sub: 'Bakım gerekiyor',
    },
    {
        key: 'kiosks', label: 'KİOSKLAR', icon: Tv,
        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
        glow: 'rgba(245,158,11,0.12)', field: 'total_kiosks', sub: 'Toplam kiosk',
    },
    {
        key: 'printers', label: 'YAZICILAR', icon: Printer,
        color: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)',
        glow: 'rgba(236,72,153,0.12)', field: 'total_printers', sub: 'Toplam yazıcı',
    },
    {
        key: 'licenses', label: 'LİSANSLAR', icon: KeyRound,
        color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.25)',
        glow: 'rgba(20,184,166,0.12)', field: 'total_licenses', sub: 'Toplam lisans',
    },
    {
        key: 'employees', label: 'PERSONEL', icon: Users,
        color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',
        glow: 'rgba(16,185,129,0.12)', field: 'total_employees', sub: 'Kayıtlı kişi',
    },
];

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function StatCard({ label, icon: Icon, color, bg, border, glow, value, sub, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                position: 'relative',
                padding: '24px 22px',
                borderRadius: 16,
                backgroundColor: 'rgba(10,15,30,0.8)',
                border: `1px solid ${border}`,
                boxShadow: `0 0 20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.02)`,
                transition: 'all 0.4s',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 0 30px ${glow}, 0 8px 30px rgba(0,0,0,0.3)`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 0 20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.02)`;
            }}
        >
            {/* Top colored line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${color}, transparent)`,
            }} />

            {/* Icon */}
            <div style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
                <Icon style={{ width: 20, height: 20, color }} />
            </div>

            {/* Label */}
            <p style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: '#64748b', marginBottom: 8,
            }}>
                {label}
            </p>

            {/* Value */}
            <p style={{
                fontSize: 36, fontWeight: 800, color: '#f1f5f9',
                lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 6,
                fontFamily: 'Inter, sans-serif',
            }}>
                {(value ?? 0).toLocaleString('tr-TR')}
            </p>

            {/* Sub text */}
            <p style={{ fontSize: 11, color: '#475569' }}>{sub}</p>
        </div>
    );
}

export default function StatsCards({ stats }) {
    const navigate = useNavigate();

    if (!stats) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Fixed cards */}
            {fixedCards.map(({ key, label, icon, color, bg, border, glow, field, sub }) => (
                <StatCard
                    key={key}
                    label={label}
                    icon={icon}
                    color={color}
                    bg={bg}
                    border={border}
                    glow={glow}
                    value={stats[field]}
                    sub={sub}
                />
            ))}

            {/* Dynamic category cards */}
            {(stats.dynamic_categories || []).map((cat) => (
                <StatCard
                    key={`cat-${cat.id}`}
                    label={cat.name.toUpperCase()}
                    icon={Layers}
                    color={cat.color}
                    bg={hexToRgba(cat.color, 0.08)}
                    border={hexToRgba(cat.color, 0.25)}
                    glow={hexToRgba(cat.color, 0.12)}
                    value={cat.count}
                    sub={`Toplam ${cat.name.toLowerCase()}`}
                    onClick={() => navigate(`/inventory/dynamic/${cat.slug}`)}
                />
            ))}
        </div>
    );
}
