import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider } from '../../app/providers/SidebarProvider';

export function DashboardLayout() {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
