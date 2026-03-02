/**
 * Page: Dashboard — matches the reference design.
 */
import { useEffect, useState } from 'react';
import { Plus, ClipboardList, Activity, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import StatsCards from '../components/organisms/StatsCards';
import AssignmentModal from '../components/organisms/AssignmentModal';
import Badge from '../components/atoms/Badge';

export default function Dashboard() {
    const { dashboardStats, fetchDashboardStats } = useStore();
    const [assignOpen, setAssignOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchDashboardStats(); }, []);

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <h2 className="page-title">
                    <span className="page-title-icon"><Activity style={{ width: 18, height: 18 }} /></span>
                    Dashboard
                </h2>
                <p className="page-subtitle">IT envanter durumuna genel bakış</p>
            </div>

            {/* Stats cards */}
            <div style={{ marginBottom: 28 }}>
                <StatsCards stats={dashboardStats} />
            </div>

            {/* Quick actions — matching reference screenshot style */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28, maxWidth: 500 }}>
                <button
                    onClick={() => navigate('/inventory')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '16px 20px', borderRadius: 14,
                        backgroundColor: 'rgba(10,15,30,0.8)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        color: '#e2e8f0', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.25s',
                        fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.backgroundColor = 'rgba(10,15,30,0.8)'; }}
                >
                    <Plus style={{ width: 18, height: 18, color: '#10b981' }} />
                    Hızlı Bilgisayar Ekle
                </button>
                <button
                    onClick={() => setAssignOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '16px 20px', borderRadius: 14,
                        backgroundColor: 'rgba(10,15,30,0.8)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: '#e2e8f0', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.25s',
                        fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.backgroundColor = 'rgba(10,15,30,0.8)'; }}
                >
                    <ClipboardList style={{ width: 18, height: 18, color: '#818cf8' }} />
                    Zimmet Ata
                </button>
            </div>



            <AssignmentModal
                isOpen={assignOpen}
                onClose={() => setAssignOpen(false)}
                onSuccess={() => fetchDashboardStats()}
            />
        </div>
    );
}
