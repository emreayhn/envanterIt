/**
 * Organism: Sidebar
 */
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Monitor, KeyRound, Users, ClipboardList, Server, GitBranch, UserCog } from 'lucide-react';
import UserProfileCard from '../molecules/UserProfileCard';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Envanter', icon: Monitor },
    { to: '/licenses', label: 'Lisanslar', icon: KeyRound },
    { to: '/employees', label: 'Personel', icon: Users },
    { to: '/assignments', label: 'Zimmetler', icon: ClipboardList },
    { to: '/processes', label: 'Süreç Yönetimi', icon: GitBranch },
];

const adminItems = [
    { to: '/users', label: 'Kullanıcılar', icon: UserCog },
];

export default function Sidebar({ user, onLogout }) {
    const location = useLocation();

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">
                    <Server style={{ width: 20, height: 20, color: 'white' }} />
                </div>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
                        IT Envanter
                    </h1>
                    <p style={{ fontSize: 11, color: '#475569', marginTop: -2 }}>Takip Sistemi v1.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <p className="sidebar-label">Ana Menü</p>
                {navItems.map((item) => {
                    // For /inventory, also match sub-routes like /inventory/computers
                    const isActive = item.to === '/'
                        ? location.pathname === '/'
                        : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end
                            className={`nav-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon style={{ width: 18, height: 18 }} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Admin Navigation */}
            {user?.role === 'admin' && (
                <nav className="sidebar-nav" style={{ paddingTop: 0 }}>
                    <p className="sidebar-label">Yönetim</p>
                    {adminItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                            >
                                <item.icon style={{ width: 18, height: 18 }} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            )}

            {/* User Profile */}
            <div className="sidebar-footer">
                <UserProfileCard
                    name={user?.name || 'IT Admin'}
                    email={user?.email || ''}
                    photoUrl={user?.photoUrl}
                    onLogout={onLogout}
                />
            </div>
        </aside>
    );
}
