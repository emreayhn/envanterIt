/**
 * AppModal — replaces browser alert() and confirm() dialogs.
 *
 * Usage:
 *   <AppModal
 *     open={true}
 *     title="Uyarı"
 *     message="Bu kaydı silmek istediğinize emin misiniz?"
 *     type="confirm"          // "alert" | "confirm" | "success" | "warning" | "error"
 *     onConfirm={() => {}}
 *     onCancel={() => {}}
 *     confirmText="Evet, Sil"
 *     cancelText="İptal"
 *     details={["Detail 1", "Detail 2"]}   // optional list rendered below message
 *   />
 */
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const iconMap = {
    alert: <Info style={{ width: 28, height: 28, color: '#6366f1' }} />,
    confirm: <AlertTriangle style={{ width: 28, height: 28, color: '#f59e0b' }} />,
    success: <CheckCircle style={{ width: 28, height: 28, color: '#10b981' }} />,
    warning: <AlertTriangle style={{ width: 28, height: 28, color: '#f59e0b' }} />,
    error: <XCircle style={{ width: 28, height: 28, color: '#ef4444' }} />,
};

const accentMap = {
    alert: '#6366f1',
    confirm: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
};

export default function AppModal({
    open,
    title = 'Bilgi',
    message = '',
    type = 'alert',
    onConfirm,
    onCancel,
    confirmText,
    cancelText = 'İptal',
    details,
}) {
    if (!open) return null;

    const accent = accentMap[type] || accentMap.alert;
    const icon = iconMap[type] || iconMap.alert;
    const isConfirm = type === 'confirm';
    const btnLabel = confirmText || (isConfirm ? 'Evet' : 'Tamam');

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.15s ease',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) (onCancel || onConfirm)?.(); }}
        >
            <div
                style={{
                    background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(10,15,30,0.98))',
                    border: `1px solid ${accent}22`,
                    borderRadius: 20, padding: '32px 28px', maxWidth: 440, width: '90%',
                    boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${accent}10`,
                    animation: 'slideUp 0.2s ease',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: `${accent}12`, border: `1px solid ${accent}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{title}</h3>
                    </div>
                    <button
                        onClick={onCancel || onConfirm}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#475569', padding: 4, display: 'flex',
                        }}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 16px' }}>
                        {message}
                    </p>
                )}

                {/* Details list */}
                {details && details.length > 0 && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 12, marginBottom: 20,
                        background: `${accent}08`, border: `1px solid ${accent}15`,
                    }}>
                        {details.map((d, i) => (
                            <div key={i} style={{
                                fontSize: 13, color: '#cbd5e1', padding: '4px 0',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                    background: accent,
                                }} />
                                {d}
                            </div>
                        ))}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
                    {isConfirm && (
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                border: '1px solid rgba(99,102,241,0.1)', background: 'rgba(99,102,241,0.04)',
                                color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                            color: '#fff', boxShadow: `0 4px 15px ${accent}30`,
                        }}
                    >
                        {btnLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
