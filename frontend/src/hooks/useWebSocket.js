/**
 * useWebSocket hook — real-time updates via WebSocket.
 * Listens for REFRESH messages and triggers store re-fetch.
 */
import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

export default function useWebSocket() {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const {
        fetchComputers,
        fetchEmployees,
        fetchLicenses,
        fetchAssignments,
        fetchKiosks,
        fetchPrinters,
        fetchDashboardStats,
    } = useStore();

    const refreshMap = {
        computers: fetchComputers,
        employees: fetchEmployees,
        licenses: fetchLicenses,
        assignments: fetchAssignments,
        kiosks: fetchKiosks,
        printers: fetchPrinters,
        dashboard: fetchDashboardStats,
    };

    const connect = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'REFRESH' && refreshMap[msg.entity]) {
                    refreshMap[msg.entity]();
                }
                if (msg.type === 'PENDING_USER') {
                    // Could show a notification to admin
                    fetchDashboardStats();
                }
            } catch (e) {
                // ignore parse errors
            }
        };

        ws.onclose = () => {
            // Reconnect after 3 seconds
            reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };
    };

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, []);
}
