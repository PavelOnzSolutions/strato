import { Outlet } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';

const FullscreenLayout = () => {
    usePageTitle('Error');
    return (

        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4 transition-colors duration-300">
            <div className="w-full max-w-md text-center">
                <Outlet />
            </div>
        </div>

    );
};

export default FullscreenLayout;