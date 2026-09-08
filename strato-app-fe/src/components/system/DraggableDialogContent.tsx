import * as Dialog from '@radix-ui/react-dialog';
import { Theme } from '@radix-ui/themes';
import { motion, useDragControls } from 'motion/react';
import React from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';

interface DraggableDialogContentProps extends React.ComponentPropsWithoutRef<typeof Dialog.Content> {
    children: React.ReactNode;
    title?: string;
    maxWidth?: string;
    maxHeight?: string;
    width?: string;
    height?: string;
}

export const DraggableDialogContent = React.forwardRef<HTMLDivElement, DraggableDialogContentProps>(
    ({ children, title, maxWidth, maxHeight, width, height, style, ...props }, ref) => {
        const dragControls = useDragControls();
        const { appearance, accentColor } = useTheme();

        return (
            <Dialog.Portal>
                {/* Wrap portal content in Theme to restore Radix UI styling */}
                <Theme appearance={appearance as any} accentColor={accentColor as any} radius="large">
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" />
                    <Dialog.Content
                        {...props}
                        ref={ref}
                        asChild
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            ...style
                        }}
                    >
                        <motion.div
                            drag
                            dragControls={dragControls}
                            dragListener={false}
                            dragMomentum={false}
                            dragElastic={0}
                            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
                            className="rt-DialogContent fixed z-50 flex flex-col p-0 overflow-hidden"
                            style={{
                                maxWidth: maxWidth || 'var(--dialog-content-max-width)',
                                maxHeight: maxHeight || 'var(--dialog-content-max-height)',
                                width: width || 'var(--dialog-content-width)',
                                height: height || 'var(--dialog-content-height)'
                            }}
                        >
                            {/* Draggable Header */}
                            <div
                                onPointerDown={(e) => dragControls.start(e)}
                                className="cursor-grab active:cursor-grabbing flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/5 select-none"
                            >
                                <Dialog.Title className="m-0 text-[10px] font-black tracking-widest uppercase opacity-40">
                                    {title}
                                </Dialog.Title>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {children}
                            </div>
                        </motion.div>
                    </Dialog.Content>
                </Theme>
            </Dialog.Portal>
        );
    }
);