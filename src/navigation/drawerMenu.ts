import { AccountType } from '../types/account';

export type MenuAction = 'logout' | 'upgrade';

export interface MenuItemConfig {
    icon: string;
    label: string;
    routeName?: string;
    action?: MenuAction;
    allowedRoles?: AccountType[]; // If defined, ONLY these roles can see it
    excludedRoles?: AccountType[]; // If defined, these roles CANNOT see it
    dashboardSection?: string; // For super admin dashboard
}

export interface MenuGroupConfig {
    title: string;
    items: MenuItemConfig[];
    superAdminOnly?: boolean; // If true, only for super_admin
}

// Roles that are considered "Professional" (Non-Traveler)
export const PRO_ROLES: AccountType[] = [
    'Host',
    'Agency',
    'AdventurePro',
    'Creator',
    'StayHost',
    'RideCreator',
    'EventOrganizer',
    'superAdmin'
];

export const DRAWER_MENU: MenuGroupConfig[] = [
    {
        title: 'Super Admin',
        superAdminOnly: true,
        items: [
            { icon: 'grid-outline', label: 'Dashboard Overview', routeName: 'SuperAdminDashboard', dashboardSection: 'dashboard' },
            { icon: 'people-outline', label: 'User Management', routeName: 'SuperAdminDashboard', dashboardSection: 'users' },
            { icon: 'check-circle-outline', label: 'Host Verifications', routeName: 'SuperAdminDashboard', dashboardSection: 'host-verifications' },
            { icon: 'briefcase-outline', label: 'Trip Approvals', routeName: 'SuperAdminDashboard', dashboardSection: 'trip-approvals' },
            { icon: 'chatbubbles-outline', label: 'Reports & Reviews', routeName: 'SuperAdminDashboard', dashboardSection: 'reports' },
            { icon: 'calendar-outline', label: 'Upcoming Verifications', routeName: 'SuperAdminDashboard', dashboardSection: 'upcoming' },
            { icon: 'cube-outline', label: 'Package Management', routeName: 'SuperAdminDashboard', dashboardSection: 'packages' },
            { icon: 'stats-chart-outline', label: 'Analytics', routeName: 'SuperAdminDashboard', dashboardSection: 'analytics' },
        ],
    },
    {
        title: 'Tools',
        items: [
            // HOST ONLY TOOLS
            {
                icon: 'grid-outline',
                label: 'Dashboard',
                routeName: 'Dashboard',
                allowedRoles: PRO_ROLES
            },
            {
                icon: 'briefcase-outline',
                label: 'Host Tools',
                routeName: 'Host Tools',
                allowedRoles: PRO_ROLES
            },

            // COMMON TOOLS
            { icon: 'card-outline', label: 'Traveler Card', routeName: 'Traveler Card' },
            { icon: 'location-outline', label: "Sanchari's Near You", routeName: "Sanchari's Near You" },
            { icon: 'map-outline', label: 'Itinerary Builder', routeName: 'Itinerary Builder' },
        ],
    },
    {
        title: 'Rewards',
        items: [
            { icon: 'wallet-outline', label: 'Explorer Wallet', routeName: 'Explorer Wallet' },
            { icon: 'trophy-outline', label: 'Achievements', routeName: 'Achievements' },
        ],
    },
    {
        title: 'Settings',
        superAdminOnly: true, // Super Admin specific settings group
        items: [
            { icon: 'settings-outline', label: 'Settings', routeName: 'SuperAdminDashboard', dashboardSection: 'settings' },
            { icon: 'log-out-outline', label: 'Logout', action: 'logout' },
        ],
    },
    {
        title: 'Settings',
        items: [
            { icon: 'settings-outline', label: 'Account Settings', routeName: 'Account Settings' },
            {
                icon: 'arrow-up-circle-outline',
                label: 'Upgrade Account',
                action: 'upgrade',
                excludedRoles: ['superAdmin']
            },
            { icon: 'help-circle-outline', label: 'Help & Support', routeName: 'Help & Support' },
            { icon: 'document-text-outline', label: 'Terms & Policies', routeName: 'Terms & Policies' },
            { icon: 'log-out-outline', label: 'Logout', action: 'logout' },
        ],
    },
];
