import { create } from 'zustand';
import {
    getComputers,
    getEmployees,
    getLicenses,
    getAssignments,
    getDashboardStats,
    getKiosks,
    getPrinters,
} from '../services/api';

const useStore = create((set) => ({
    // ── Data ─────────────────────────────────────────────
    computers: [],
    kiosks: [],
    printers: [],
    employees: [],
    licenses: [],
    assignments: [],
    dashboardStats: null,
    loading: false,
    error: null,

    // ── Actions ──────────────────────────────────────────
    fetchComputers: async (params) => {
        set({ loading: true });
        try {
            const { data } = await getComputers(params);
            set({ computers: data, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    fetchKiosks: async (params) => {
        set({ loading: true });
        try {
            const { data } = await getKiosks(params);
            set({ kiosks: data, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    fetchPrinters: async (params) => {
        set({ loading: true });
        try {
            const { data } = await getPrinters(params);
            set({ printers: data, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    fetchEmployees: async (params) => {
        try {
            const { data } = await getEmployees(params);
            set({ employees: data });
        } catch (err) {
            set({ error: err.message });
        }
    },

    fetchLicenses: async (params) => {
        set({ loading: true });
        try {
            const { data } = await getLicenses(params);
            set({ licenses: data, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    fetchAssignments: async (params) => {
        try {
            const { data } = await getAssignments(params);
            set({ assignments: data });
        } catch (err) {
            set({ error: err.message });
        }
    },

    fetchDashboardStats: async () => {
        try {
            const { data } = await getDashboardStats();
            set({ dashboardStats: data });
        } catch (err) {
            set({ error: err.message });
        }
    },
}));

export default useStore;
