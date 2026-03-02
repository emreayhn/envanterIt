/**
 * Template: DashboardLayout
 */
import { Outlet } from 'react-router-dom';
import Sidebar from '../organisms/Sidebar';

export default function DashboardLayout({ user, onLogout }) {
    return (
        <>
            <Sidebar user={user} onLogout={onLogout} />
            <main className="main-content">
                <div className="page-wrapper">
                    <Outlet />
                </div>
            </main>
        </>
    );
}
