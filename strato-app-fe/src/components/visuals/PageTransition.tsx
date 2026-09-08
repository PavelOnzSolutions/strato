import { motion, Variants, Transition } from 'motion/react';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.99,
    },
};

const pageTransition: Transition = {
    type: 'tween',
    ease: [0.4, 0, 0.2, 1],
    duration: 0.4,
};

const PageTransition = ({ children, className = '' }: PageTransitionProps) => {
    // @ts-ignore
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
