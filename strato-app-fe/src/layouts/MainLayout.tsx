import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.tsx';
import Sidebar from '../components/layout/Sidebar.tsx';
import Footer from '../components/layout/Footer.tsx';
import AnimatedBackground from '../components/visuals/AnimatedBackground.tsx';
import PageTransition from '../components/visuals/PageTransition.tsx';
import DevOpsAssistant from '../components/assistant/DevOpsAssistant.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { user } = useAuth();
    const { loadUserConfiguration } = useTheme();

    useEffect(() => {
        if (user?.username) {
            loadUserConfiguration(user.username);
        }
    }, [user?.username, loadUserConfiguration]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="h-screen flex bg-(--color-background) transition-colors duration-300 overflow-hidden relative">
            {/* Animated Background */}
            <AnimatedBackground />

            <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ">
                <Navbar toggleSidebar={toggleSidebar} />

                <main className="flex-1 p-6 overflow-y-auto custom-scrollbar smooth-scroll">
                    <div className="max-w-8xl mx-auto" style={{height: 'auto'}}>
                        <PageTransition key={location.pathname}>
                            <Outlet />
                        </PageTransition>
                    </div>
                </main>

                <Footer />
                <DevOpsAssistant />
            </div>
        </div>
    );
};

export default MainLayout;
