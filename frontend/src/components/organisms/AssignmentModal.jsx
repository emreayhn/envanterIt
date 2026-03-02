/**
 * Organism: AssignmentModal — with searchable dropdowns.
 */
import { useState, useEffect } from 'react';
import { X, ClipboardList } from 'lucide-react';
import { getComputers, getEmployees, createAssignment } from '../../services/api';
import SearchableSelect from '../molecules/SearchableSelect';

export default function AssignmentModal({ isOpen, onClose, onSuccess }) {
    const [computers, setComputers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [computerId, setComputerId] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setComputerId('');
            setEmployeeId('');
            setError('');
            getComputers({ status: 'STOCK' })
                .then((res) => setComputers(res.data))
                .catch(() => setComputers([]));
            getEmployees()
                .then((res) => setEmployees(res.data))
                .catch(() => setEmployees([]));
        }
    }, [isOpen]);

    const computerOptions = computers.map((c) => ({
        value: String(c.id),
        label: c.computer_name ? `${c.computer_name} — ${c.brand} ${c.model}` : `${c.brand} ${c.model}`,
        sub: c.serial_no,
    }));

    const employeeOptions = employees.map((e) => ({
        value: String(e.id),
        label: e.full_name,
        sub: e.department || '',
    }));

    const handleSubmit = async () => {
        if (!computerId || !employeeId) {
            setError('Lütfen bilgisayar ve personel seçin.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await createAssignment({
                computer_id: Number(computerId),
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
                    borderRadius: 16, padding: 32, width: '100%', maxWidth: 420,
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
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Bilgisayar → Personel</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 8 }}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px', marginBottom: 16, borderRadius: 8,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                {/* Computer select */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                        Bilgisayar (Stokta)
                    </label>
                    <SearchableSelect
                        options={computerOptions}
                        value={computerId}
                        onChange={(v) => { setComputerId(v); setError(''); }}
                        placeholder="Bilgisayar ara veya seç..."
                    />
                    {computers.length === 0 && (
                        <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>Stokta bilgisayar yok.</p>
                    )}
                </div>

                {/* Employee select */}
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
