/**
 * Page: UserManagement — Admin panel to manage all users.
 */
import { useEffect, useState } from 'react';
import { getPendingUsers, approveUser, rejectUser, deleteUser, resetUserPassword, changePassword } from '../services/api';
import Button from '../components/atoms/Button';
import { UserCheck, UserX, Users, Clock, ShieldCheck, Trash2, KeyRound, Lock, X } from 'lucide-react';
import api from '../services/api';

export default function UserManagement() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [message, setMessage] = useState({ text: '', type: '' });

    // Password modals
    const [resetModal, setResetModal] = useState({ open: false, userId: null, userName: '' });
    const [newPassword, setNewPassword] = useState('');
    const [changeModal, setChangeModal] = useState(false);
    const [changeForm, setChangeForm] = useState({ current: '', new: '', confirm: '' });

    const fetchData = async () => {
        try {
            const [pendingRes, allRes] = await Promise.all([
                getPendingUsers(),
                api.get('/auth/users'),
            ]);
            setPendingUsers(pendingRes.data);
            setAllUsers(allRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleApprove = async (id) => {
        await approveUser(id);
        showMessage('Kullanıcı onaylandı');
        fetchData();
    };

    const handleReject = async (id) => {
        if (!confirm('Bu kullanıcıyı reddetmek istediğinize emin misiniz?')) return;
        await rejectUser(id);
        showMessage('Kullanıcı reddedildi');
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await deleteUser(id);
            showMessage('Kullanıcı silindi');
            fetchData();
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Silme başarısız', 'error');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            showMessage('Şifre en az 6 karakter olmalı', 'error');
            return;
        }
        try {
            await resetUserPassword(resetModal.userId, { new_password: newPassword });
            showMessage(`${resetModal.userName} şifresi sıfırlandı`);
            setResetModal({ open: false, userId: null, userName: '' });
            setNewPassword('');
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Şifre sıfırlama başarısız', 'error');
        }
    };

    const handleChangeOwnPassword = async () => {
        if (changeForm.new !== changeForm.confirm) {
            showMessage('Yeni şifreler eşleşmiyor', 'error');
            return;
        }
        if (changeForm.new.length < 6) {
            showMessage('Şifre en az 6 karakter olmalı', 'error');
            return;
        }
        try {
            await changePassword({ current_password: changeForm.current, new_password: changeForm.new });
            showMessage('Şifreniz başarıyla değiştirildi');
            setChangeModal(false);
            setChangeForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Şifre değiştirme başarısız', 'error');
        }
    };

    const pendingCount = pendingUsers.length;

    const inputStyle = {
        width: '100%', padding: '12px 16px', fontSize: 13, color: '#e2e8f0',
        backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
        outline: 'none', fontFamily: 'Inter, sans-serif',
    };

    const modalOverlay = {
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    };

    const modalBox = {
        background: '#111827', border: '1px solid #1e293b',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">
                        <Users className="w-7 h-7 text-indigo-400" />
                        Kullanıcı Yönetimi
                    </h1>
                    <p className="page-subtitle">Kullanıcıları görüntüleyin ve yönetin</p>
                </div>
                <Button icon={Lock} onClick={() => setChangeModal(true)} variant="secondary">
                    Şifremi Değiştir
                </Button>
            </div>

            {/* Success/Error message */}
            {message.text && (
                <div style={{
                    padding: '12px 20px', borderRadius: 12, marginBottom: 16, fontSize: 13, fontWeight: 600,
                    background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    color: message.type === 'error' ? '#f87171' : '#34d399',
                }}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                    onClick={() => setTab('all')}
                    style={{
                        padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        backgroundColor: tab === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(30,41,59,0.5)',
                        color: tab === 'all' ? '#818cf8' : '#94a3b8',
                    }}
                >
                    <ShieldCheck style={{ width: 16, height: 16, display: 'inline', marginRight: 6, verticalAlign: '-3px' }} />
                    Tüm Kullanıcılar ({allUsers.filter(u => u.is_approved).length})
                </button>
                <button
                    onClick={() => setTab('pending')}
                    style={{
                        padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        backgroundColor: tab === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(30,41,59,0.5)',
                        color: tab === 'pending' ? '#f59e0b' : '#94a3b8', position: 'relative',
                    }}
                >
                    <Clock style={{ width: 16, height: 16, display: 'inline', marginRight: 6, verticalAlign: '-3px' }} />
                    Onay Bekleyenler
                    {pendingCount > 0 && (
                        <span style={{
                            position: 'absolute', top: -6, right: -6,
                            backgroundColor: '#ef4444', color: 'white',
                            borderRadius: '50%', width: 20, height: 20,
                            fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <p className="text-slate-400">Yükleniyor...</p>
            ) : tab === 'pending' ? (
                pendingUsers.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Onay bekleyen kullanıcı yok</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {pendingUsers.map((user) => (
                            <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                                <div>
                                    <p className="font-semibold text-white">{user.full_name}</p>
                                    <p className="text-sm text-slate-400">{user.email}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(user.created_at).toLocaleString('tr-TR')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => handleApprove(user.id)} icon={UserCheck} size="sm"
                                        style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>Onayla</Button>
                                    <Button onClick={() => handleReject(user.id)} icon={UserX} size="sm" variant="danger">Reddet</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                        <thead>
                            <tr style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                                <th style={{ padding: '8px 16px', textAlign: 'left' }}>Ad Soyad</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left' }}>E-posta</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left' }}>Rol</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left' }}>Kayıt Tarihi</th>
                                <th style={{ padding: '8px 16px', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.filter(u => u.is_approved).map((user) => (
                                <tr key={user.id} style={{ backgroundColor: 'rgba(10,15,30,0.6)' }}>
                                    <td style={{ padding: '14px 16px', color: '#f1f5f9', fontWeight: 600 }}>{user.full_name}</td>
                                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{user.email}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                            backgroundColor: user.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                                            color: user.role === 'admin' ? '#a78bfa' : '#34d399',
                                        }}>
                                            {user.role === 'admin' ? '👑 Admin' : 'Kullanıcı'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                                        {new Date(user.created_at).toLocaleString('tr-TR')}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => { setResetModal({ open: true, userId: user.id, userName: user.full_name }); setNewPassword(''); }}
                                                title="Şifre Sıfırla"
                                                style={{
                                                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                                                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#fbbf24',
                                                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                                }}
                                            >
                                                <KeyRound style={{ width: 14, height: 14 }} /> Şifre
                                            </button>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    title="Kullanıcıyı Sil"
                                                    style={{
                                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                                        borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f87171',
                                                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                                    }}
                                                >
                                                    <Trash2 style={{ width: 14, height: 14 }} /> Sil
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetModal.open && (
                <div style={modalOverlay} onClick={() => setResetModal({ open: false, userId: null, userName: '' })}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                                Şifre Sıfırla — {resetModal.userName}
                            </h3>
                            <button onClick={() => setResetModal({ open: false, userId: null, userName: '' })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Yeni Şifre</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="En az 6 karakter"
                            style={inputStyle}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <Button variant="ghost" onClick={() => setResetModal({ open: false, userId: null, userName: '' })}>İptal</Button>
                            <Button icon={KeyRound} onClick={handleResetPassword}>Şifreyi Sıfırla</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Own Password Modal */}
            {changeModal && (
                <div style={modalOverlay} onClick={() => setChangeModal(false)}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Şifremi Değiştir</h3>
                            <button onClick={() => setChangeModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Mevcut Şifre</label>
                                <input type="password" value={changeForm.current} onChange={e => setChangeForm(f => ({ ...f, current: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Yeni Şifre</label>
                                <input type="password" value={changeForm.new} onChange={e => setChangeForm(f => ({ ...f, new: e.target.value }))} placeholder="En az 6 karakter" style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Yeni Şifre (Tekrar)</label>
                                <input type="password" value={changeForm.confirm} onChange={e => setChangeForm(f => ({ ...f, confirm: e.target.value }))} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <Button variant="ghost" onClick={() => setChangeModal(false)}>İptal</Button>
                            <Button icon={Lock} onClick={handleChangeOwnPassword}>Şifreyi Değiştir</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
