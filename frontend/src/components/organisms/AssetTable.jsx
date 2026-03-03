/**
 * Organism: AssetTable — premium data table with expandable rows.
 * Click a row to see full details (specs, assignment info).
 */
import { useState, useEffect } from 'react';
import { ArrowUpDown, Trash2, Edit, Search, Monitor, ChevronDown, ChevronUp, User, Cpu, HardDrive, Hash, Calendar, Tag, AlertTriangle } from 'lucide-react';
import Badge from '../atoms/Badge';
import { getComputerAssignments } from '../../services/api';

export default function AssetTable({ computers, onDelete, onEdit, selectMode = false, selectedIds = new Set(), onToggleSelect, onToggleAll }) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('id');
    const [sortDir, setSortDir] = useState('desc');
    const [expandedId, setExpandedId] = useState(null);
    const [assignments, setAssignments] = useState([]);

    const filtered = computers
        .filter((c) => {
            const q = search.toLowerCase();
            return (
                c.brand?.toLowerCase().includes(q) ||
                c.model?.toLowerCase().includes(q) ||
                c.serial_no?.toLowerCase().includes(q) ||
                (c.computer_name || '').toLowerCase().includes(q) ||
                (c.specifications?.ram || '').toLowerCase().includes(q) ||
                (c.specifications?.cpu || '').toLowerCase().includes(q) ||
                (c.wifi_mac || '').toLowerCase().includes(q) ||
                (c.ethernet_mac || '').toLowerCase().includes(q) ||
                (c.tesis || '').toLowerCase().includes(q) ||
                (c.lokasyon || '').toLowerCase().includes(q) ||
                (c.assigned_to || '').toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            const aVal = a[sortField] ?? '';
            const bVal = b[sortField] ?? '';
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

    const toggleSort = (field) => {
        if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('asc'); }
    };

    const toggleExpand = async (id) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        try {
            const { data } = await getComputerAssignments(id);
            setAssignments(data);
        } catch { setAssignments([]); }
    };

    // Detail row sub-component
    const DetailRow = ({ computer }) => {
        const specs = computer.specifications || {};
        const infoItems = [
            { icon: Monitor, label: 'Bilgisayar Adı', value: computer.computer_name },
            { icon: Tag, label: 'Marka', value: computer.brand },
            { icon: Tag, label: 'Model', value: computer.model },
            { icon: Hash, label: 'Seri No', value: computer.serial_no },
            { icon: Cpu, label: 'İşlemci (CPU)', value: specs.cpu },
            { icon: HardDrive, label: 'RAM', value: specs.ram },
            { icon: Hash, label: 'Wi-Fi MAC', value: computer.wifi_mac },
            { icon: Hash, label: 'Ethernet MAC', value: computer.ethernet_mac },
            { icon: Tag, label: 'Tesis', value: computer.tesis },
            { icon: Tag, label: 'Lokasyon', value: computer.lokasyon },
            { icon: Calendar, label: 'Eklenme Tarihi', value: computer.created_at ? new Date(computer.created_at).toLocaleDateString('tr-TR') : null },
        ].filter((i) => i.value);

        return (
            <tr>
                <td colSpan={13} style={{ padding: 0 }}>
                    <div style={{
                        background: 'rgba(99,102,241,0.03)',
                        borderTop: '1px solid rgba(99,102,241,0.08)',
                        borderBottom: '1px solid rgba(99,102,241,0.08)',
                        padding: '20px 28px',
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: assignments.length > 0 ? 20 : 0 }}>
                            {infoItems.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(15,23,42,0.4)',
                                    border: '1px solid rgba(99,102,241,0.06)',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                        background: 'rgba(99,102,241,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <item.icon style={{ width: 14, height: 14, color: '#6366f1' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{item.label}</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                            {/* Status badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(15,23,42,0.4)',
                                border: '1px solid rgba(99,102,241,0.06)',
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                    background: 'rgba(99,102,241,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Monitor style={{ width: 14, height: 14, color: '#6366f1' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>Durum</div>
                                    <Badge status={computer.status} />
                                </div>
                            </div>
                        </div>

                        {/* Assignments section */}
                        {assignments.length > 0 && (
                            <div style={{
                                padding: '14px 18px', borderRadius: 12,
                                background: 'rgba(99,102,241,0.04)',
                                border: '1px solid rgba(99,102,241,0.08)',
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User style={{ width: 13, height: 13 }} /> Zimmet Bilgileri
                                </div>
                                {/* Sort active first */}
                                {[...assignments].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)).map((a, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                                        borderTop: i > 0 ? '1px solid rgba(99,102,241,0.06)' : 'none',
                                        opacity: a.is_active ? 1 : 0.5,
                                    }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                                            background: a.is_active
                                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                : 'rgba(71,85,105,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, fontWeight: 700, color: '#fff',
                                        }}>
                                            {a.employee_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: 13, color: a.is_active ? '#e2e8f0' : '#64748b', fontWeight: 500 }}>{a.employee_name}</span>
                                        {/* Active / Returned badge */}
                                        {a.is_active ? (
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                                                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                                border: '1px solid rgba(16,185,129,0.2)',
                                            }}>Aktif</span>
                                        ) : (
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                                                background: 'rgba(100,116,139,0.1)', color: '#64748b',
                                                border: '1px solid rgba(100,116,139,0.15)',
                                            }}>İade Edildi</span>
                                        )}
                                        <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
                                            {a.is_active
                                                ? (a.assigned_date ? `Zimmet: ${a.assigned_date}` : '')
                                                : (a.returned_date ? `İade: ${a.returned_date}` : '')
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {assignments.length === 0 && computer.status === 'STOCK' && (
                            <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                                Bu bilgisayar şu anda kimseye zimmetli değildir.
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
            {/* Search */}
            <div style={{ padding: 20, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                    <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Bilgisayar adı, marka, model, seri no, RAM, CPU ile ara..."
                        className="input"
                        style={{ paddingLeft: 44 }}
                    />
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {selectMode && (
                                <th style={{ width: 42, textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))}
                                        onChange={() => onToggleAll?.(filtered)}
                                        style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                    />
                                </th>
                            )}
                            {[
                                { field: 'id', label: 'ID' },
                                { field: 'computer_name', label: 'PC Adı' },
                                { field: 'brand', label: 'Marka' },
                                { field: 'model', label: 'Model' },
                                { field: 'serial_no', label: 'Seri No' },
                                { field: 'ram', label: 'RAM' },
                                { field: 'cpu', label: 'CPU' },
                                { field: 'wifi_mac', label: 'Wi-Fi MAC' },
                                { field: 'ethernet_mac', label: 'Ethernet MAC' },
                                { field: 'assigned_to', label: 'Zimmetli Personel' },
                                { field: 'tesis', label: 'Tesis' },
                                { field: 'lokasyon', label: 'Lokasyon' },
                                { field: 'status', label: 'Durum' },
                            ].map(({ field, label }) => (
                                <th key={field} onClick={() => toggleSort(field)} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        {label}
                                        <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === field ? 1 : 0.3 }} />
                                    </span>
                                </th>
                            ))}
                            {!selectMode && <th>İşlem</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={selectMode ? 13 : 13}>
                                    <div className="empty-state">
                                        <Monitor />
                                        <p>Kayıt bulunamadı.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c) => (
                                <>
                                    <tr
                                        key={c.id}
                                        onClick={() => selectMode ? onToggleSelect?.(c.id) : toggleExpand(c.id)}
                                        style={{
                                            cursor: 'pointer',
                                            background: selectMode && selectedIds.has(c.id)
                                                ? 'rgba(99,102,241,0.10)'
                                                : expandedId === c.id ? 'rgba(99,102,241,0.06)' : undefined,
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        {selectMode && (
                                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(c.id)}
                                                    onChange={() => onToggleSelect?.(c.id)}
                                                    style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                                />
                                            </td>
                                        )}
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 12 }}>#{c.id}</td>
                                        <td style={{ fontWeight: 500, color: '#a5b4fc' }}>{c.computer_name || '—'}</td>
                                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.brand}</td>
                                        <td style={{ color: '#94a3b8' }}>{c.model}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 12, letterSpacing: '0.05em' }}>{c.serial_no}</td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{c.specifications?.ram || '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{c.specifications?.cpu || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{c.wifi_mac || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{c.ethernet_mac || '—'}</td>
                                        <td style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 500 }}>
                                            {c.status === 'ASSIGNED' ? (c.assigned_to || '—') : '—'}
                                        </td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{c.tesis || '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{c.lokasyon || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Badge status={c.status} />
                                                {c.fault_description && (
                                                    <span title={c.fault_description}>
                                                        <AlertTriangle style={{ width: 14, height: 14, color: '#f87171', animation: 'pulse 2s infinite' }} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {!selectMode && (
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); onEdit?.(c); }} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
                                                        <Edit style={{ width: 15, height: 15 }} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDelete?.(c.id); }} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}>
                                                        <Trash2 style={{ width: 15, height: 15 }} />
                                                    </button>
                                                    {expandedId === c.id
                                                        ? <ChevronUp style={{ width: 14, height: 14, color: '#6366f1' }} />
                                                        : <ChevronDown style={{ width: 14, height: 14, color: '#475569' }} />
                                                    }
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                    {!selectMode && expandedId === c.id && <DetailRow computer={c} />}
                                </>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
