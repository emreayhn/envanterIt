/**
 * Page: UserManagement — Admin panel to approve/reject pending users.
 */
import { useEffect, useState } from 'react';
import { getPendingUsers, approveUser, rejectUser } from '../services/api';
import Button from '../components/atoms/Button';
import { UserCheck, UserX, Users, Clock } from 'lucide-react';

export default function UserManagement() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            const { data } = await getPendingUsers();
            setPendingUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id) => {
        try {
            await approveUser(id);
            fetchPending();
        } catch (err) {
            console.error(err);
        }
    };

    const handleReject = async (id) => {
        if (!confirm('Bu kullanıcıyı reddetmek istediğinize emin misiniz?')) return;
        try {
            await rejectUser(id);
            fetchPending();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users className="w-7 h-7 text-indigo-400" />
                        Kullanıcı Yönetimi
                    </h1>
                    <p className="page-subtitle">Onay bekleyen kullanıcıları yönetin</p>
                </div>
            </div>

            {loading ? (
                <p className="text-slate-400">Yükleniyor...</p>
            ) : pendingUsers.length === 0 ? (
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
                                <p className="text-xs text-slate-500 mt-1">
                                    {new Date(user.created_at).toLocaleString('tr-TR')}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleApprove(user.id)}
                                    icon={UserCheck}
                                    size="sm"
                                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}
                                >
                                    Onayla
                                </Button>
                                <Button
                                    onClick={() => handleReject(user.id)}
                                    icon={UserX}
                                    size="sm"
                                    variant="danger"
                                >
                                    Reddet
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
