import React, { createContext, useContext, useState } from 'react';

interface SidebarContextType {
    isMobileOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = () => setIsMobileOpen(prev => !prev);
    const closeSidebar = () => setIsMobileOpen(false);

    return (
        <SidebarContext.Provider value={{ isMobileOpen, toggleSidebar, closeSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
}
