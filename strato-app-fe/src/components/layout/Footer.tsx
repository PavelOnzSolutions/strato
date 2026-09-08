import {useTranslation} from "react-i18next";
import config from '../../config.ts';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="bg-(--footer-glass-bg) backdrop-blur-xl border-t border-(--glass-border) h-16 flex items-center justify-center px-8 text-center text-sm text-(--gray-11) mt-auto z-10 transition-all duration-300">
            <p>Strato WebUI v{t('lbl_copyright', '{{version}} | © {{year}} Pavel Onz. All rights reserved.', {year: new Date().getFullYear().toString(), version: config.version})}</p>
        </footer>
    );
};

export default Footer;
