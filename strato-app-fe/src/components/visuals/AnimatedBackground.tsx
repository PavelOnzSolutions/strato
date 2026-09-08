import {CSSProperties, useEffect, useRef} from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import {getHueFromAccentColor} from "../../utils/color-utils.ts";

const AnimatedBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { appearance, backgroundType, accentColor, useAccentColorForBackground } = useTheme();
    const animationRef = useRef<number>(0);
    const elementsRef = useRef<any[]>([]);
    const blobsRef = useRef<any[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const getColors = () => {
            const rootStyle = getComputedStyle(document.documentElement);
            const getVar = (name: string, fallback: string) => {
                const val = rootStyle.getPropertyValue(name).trim();
                return val || fallback;
            };

            if (useAccentColorForBackground) {
                if (appearance === 'dark') {
                    return [
                        getVar(`--${accentColor}-a6`, 'rgba(40, 180, 240, 0.3)'),
                        getVar(`--${accentColor}-a4`, 'rgba(100, 200, 255, 0.2)'),
                        getVar(`--${accentColor}-a5`, 'rgba(0, 130, 180, 0.25)')
                    ];
                } else {
                    return [
                        getVar(`--${accentColor}-a4`, 'rgba(36, 143, 188, 0.15)'),
                        getVar(`--${accentColor}-a3`, 'rgba(90, 179, 222, 0.12)'),
                        getVar(`--${accentColor}-a2`, 'rgba(0, 131, 180, 0.14)')
                    ];
                }
            } else {
                // Default colors (blue-ish)
                if (appearance === 'dark') {
                    return [
                        'rgba(40, 180, 240, 0.3)',
                        'rgba(100, 200, 255, 0.2)',
                        'rgba(0, 130, 180, 0.25)'
                    ];
                } else {
                    return [
                        'rgba(36, 143, 188, 0.15)',
                        'rgba(90, 179, 222, 0.12)',
                        'rgba(0, 131, 180, 0.14)'
                    ];
                }
            }
        };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const init = () => {
            elementsRef.current = [];
            blobsRef.current = [];
            const colors = getColors();

            if (backgroundType === 'orbs') {
                elementsRef.current = Array.from({ length: 6 }, () => ({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 300 + 200,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    colorIndex: Math.floor(Math.random() * colors.length),
                }));
            } else if (backgroundType === 'mesh') {
                const spacing = 100;
                const cols = Math.ceil(canvas.width / spacing) + 1;
                const rows = Math.ceil(canvas.height / spacing) + 1;
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        elementsRef.current.push({
                            x: x * spacing,
                            y: y * spacing,
                            originalX: x * spacing,
                            originalY: y * spacing,
                            offset: Math.random() * Math.PI * 2
                        });
                    }
                }

                // Initialize light blobs for mesh
                blobsRef.current = Array.from({ length: 8 }, () => {
                    const startIndex = Math.floor(Math.random() * elementsRef.current.length);
                    return {
                        currentIndex: startIndex,
                        targetIndex: startIndex,
                        progress: 0,
                        speed: 0.01 + Math.random() * 0.02
                    };
                });
            } else if (backgroundType === 'plasma') {
                // Plasma doesn't need elementsRef/blobsRef initialization
            } else if (backgroundType === 'starfield') {
                elementsRef.current = Array.from({ length: 600 }, () => ({
                    x: (Math.random() - 0.5) * canvas.width * 2,
                    y: (Math.random() - 0.5) * canvas.height * 2,
                    z: Math.random() * canvas.width,
                    pz: 0
                }));
                // Set pz for all stars initially to avoid first frame skip
                elementsRef.current.forEach(star => {
                    star.pz = star.z;
                });
            } else if (backgroundType === 'particles') {
                elementsRef.current = Array.from({ length: 50 }, () => ({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    radius: Math.random() * 2 + 1,
                    colorIndex: Math.floor(Math.random() * colors.length)
                }));
            } else if (backgroundType === 'waves') {
                elementsRef.current = Array.from({ length: 3 }, (_, i) => ({
                    y: canvas.height * (0.4 + i * 0.2),
                    amplitude: 50 + Math.random() * 50,
                    frequency: 0.001 + Math.random() * 0.002,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.02 + Math.random() * 0.03,
                    colorIndex: i % colors.length
                }));
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const animate = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const rootStyle = getComputedStyle(document.documentElement);
            const getVar = (name: string, fallback: string) => {
                const val = rootStyle.getPropertyValue(name).trim();
                return val || fallback;
            };

            if (backgroundType === 'orbs') {
                elementsRef.current.forEach((orb) => {
                    orb.x += orb.vx;
                    orb.y += orb.vy;
                    if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius;
                    if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius;
                    if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius;
                    if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius;

                    const colors = getColors();
                    const color = colors[orb.colorIndex] || colors[0];

                    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.beginPath();
                    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();
                });
            } else if (backgroundType === 'mesh') {
                if (useAccentColorForBackground) {
                    ctx.strokeStyle = getVar(`--${accentColor}-a5`, appearance === 'dark' ? 'rgba(100, 200, 255, 0.15)' : 'rgba(0, 131, 180, 0.1)');
                } else {
                    ctx.strokeStyle = appearance === 'dark' ? 'rgba(100, 200, 255, 0.15)' : 'rgba(0, 131, 180, 0.1)';
                }
                ctx.lineWidth = 1;
                
                const spacing = 100;
                const cols = Math.ceil(canvas.width / spacing) + 1;
                
                elementsRef.current.forEach((p) => {
                    p.x = p.originalX + Math.sin(time * 0.001 + p.offset) * 20;
                    p.y = p.originalY + Math.cos(time * 0.001 + p.offset) * 20;
                });

                elementsRef.current.forEach((p, i) => {
                    const nextRow = i + 1;
                    const nextCol = i + cols;
                    
                    if (nextRow < elementsRef.current.length && Math.floor(i / cols) === Math.floor(nextRow / cols)) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(elementsRef.current[nextRow].x, elementsRef.current[nextRow].y);
                        ctx.stroke();
                    }
                    if (nextCol < elementsRef.current.length) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(elementsRef.current[nextCol].x, elementsRef.current[nextCol].y);
                        ctx.stroke();
                    }
                });

                // Animate and draw light blobs
                blobsRef.current.forEach(blob => {
                    if (blob.progress >= 1 || blob.currentIndex === blob.targetIndex) {
                        blob.currentIndex = blob.targetIndex;
                        blob.progress = 0;
                        const i = blob.currentIndex;
                        const neighbors = [];
                        if (i % cols > 0) neighbors.push(i - 1); // left
                        if (i % cols < cols - 1 && i + 1 < elementsRef.current.length) neighbors.push(i + 1); // right
                        if (i >= cols) neighbors.push(i - cols); // up
                        if (i + cols < elementsRef.current.length) neighbors.push(i + cols); // down
                        
                        if (neighbors.length > 0) {
                            blob.targetIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
                        }
                    }

                    blob.progress += blob.speed;
                    const p1 = elementsRef.current[blob.currentIndex];
                    const p2 = elementsRef.current[blob.targetIndex];
                    
                    if (p1 && p2) {
                        const bx = p1.x + (p2.x - p1.x) * blob.progress;
                        const by = p1.y + (p2.y - p1.y) * blob.progress;
                        
                        const colors = getColors();
                        const blobColor = colors[0];
                        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, 30);
                        gradient.addColorStop(0, blobColor);
                        gradient.addColorStop(1, 'transparent');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(bx, by, 30, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            } else if (backgroundType === 'plasma') {
                const colors = getColors();
                const timeScale = time * 0.001;
                
                // Using a smaller grid for performance if we were doing pixel manipulation, 
                // but here we can just use a few overlapping gradients or functions.
                // For a true plasma effect on canvas without imageData:
                for (let i = 0; i < 3; i++) {
                    const x = canvas.width * (0.5 + 0.3 * Math.cos(timeScale * (0.5 + i * 0.2) + i));
                    const y = canvas.height * (0.5 + 0.3 * Math.sin(timeScale * (0.4 + i * 0.3) + i * 2));
                    
                    const radius = Math.max(canvas.width, canvas.height) * 0.8;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    gradient.addColorStop(0, colors[i % colors.length]);
                    gradient.addColorStop(1, 'transparent');
                    
                    ctx.globalCompositeOperation = appearance === 'dark' ? 'screen' : 'multiply';
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.globalCompositeOperation = 'source-over';
            } else if (backgroundType === 'starfield') {
                ctx.fillStyle = appearance === 'dark' ? '#000' : '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const speed = 4;
                
                const rootStyle = getComputedStyle(document.documentElement);
                const starColor = useAccentColorForBackground 
                    ? rootStyle.getPropertyValue(`--${accentColor}-11`).trim() || (appearance === 'dark' ? '#fff' : '#000')
                    : (appearance === 'dark' ? '#fff' : '#000');

                elementsRef.current.forEach(star => {
                    star.z -= speed;
                    if (star.z <= 0) {
                        star.z = canvas.width;
                        star.x = (Math.random() - 0.5) * canvas.width * 2;
                        star.y = (Math.random() - 0.5) * canvas.height * 2;
                        star.pz = star.z;
                    }

                    const sx = (star.x / star.z) * canvas.width + centerX;
                    const sy = (star.y / star.z) * canvas.height + centerY;
                    
                    if (star.pz > 0) {
                        const px = (star.x / star.pz) * canvas.width + centerX;
                        const py = (star.y / star.pz) * canvas.height + centerY;
                        
                        // Check if at least one point is on screen
                        if ((sx >= 0 && sx <= canvas.width && sy >= 0 && sy <= canvas.height) ||
                            (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height)) {
                            const r = (1 - star.z / canvas.width) * 2;
                            ctx.beginPath();
                            ctx.strokeStyle = starColor;
                            ctx.lineWidth = r;
                            ctx.moveTo(px, py);
                            ctx.lineTo(sx, sy);
                            ctx.stroke();
                        }
                    }
                    star.pz = star.z;
                });
            } else if (backgroundType === 'particles') {
                const colors = getColors();
                elementsRef.current.forEach((p, i) => {
                    p.x += p.vx;
                    p.y += p.vy;

                    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = colors[p.colorIndex] || colors[0];
                    ctx.fill();

                    for (let j = i + 1; j < elementsRef.current.length; j++) {
                        const p2 = elementsRef.current[j];
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 150) {
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            const alpha = 1 - dist / 150;
                            if (useAccentColorForBackground) {
                                ctx.strokeStyle = getVar(`--${accentColor}-a${appearance === 'dark' ? '6' : '4'}`, appearance === 'dark' 
                                    ? `rgba(100, 200, 255, ${0.15 * alpha})`
                                    : `rgba(0, 131, 180, ${0.1 * alpha})`);
                            } else {
                                ctx.strokeStyle = appearance === 'dark' 
                                    ? `rgba(100, 200, 255, ${0.15 * alpha})`
                                    : `rgba(0, 131, 180, ${0.1 * alpha})`;
                            }
                            ctx.stroke();
                        }
                    }
                });
            } else if (backgroundType === 'waves') {
                const colors = getColors();
                elementsRef.current.forEach((w) => {
                    w.phase += w.speed;
                    ctx.beginPath();
                    ctx.moveTo(0, w.y);
                    for (let x = 0; x < canvas.width; x += 10) {
                        const y = w.y + Math.sin(x * w.frequency + w.phase) * w.amplitude;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(canvas.width, canvas.height);
                    ctx.lineTo(0, canvas.height);
                    ctx.closePath();
                    ctx.fillStyle = colors[w.colorIndex] || colors[0];
                    ctx.fill();
                });
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [appearance, backgroundType, accentColor, useAccentColorForBackground]);

    return (
        <>
            {backgroundType === 'forest' && (
                <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: `${appearance === 'dark' ? 0.75 : 0.5}`, transition: 'opacity 1s ease-in-out' }}>
                    <div className="auth-forest-layer auth-forest-layer-back absolute inset-0 bg-center bg-cover" style={{ backgroundImage: 'url(/assets/images/bg-auth.jpg)' }} />
                    <div className="auth-forest-layer auth-forest-layer-mid absolute inset-0 bg-center bg-cover" style={{ backgroundImage: 'url(/assets/images/bg-auth.jpg)' }} />
                    <div className="auth-forest-layer auth-forest-layer-front absolute inset-0 bg-center bg-cover" style={{ backgroundImage: 'url(/assets/images/bg-auth.jpg)' }} />
                    <div className="auth-forest-fireflies absolute inset-0"  style={{
                        '--firefly-hue': getHueFromAccentColor(accentColor, true),
                    } as CSSProperties} />
                    <div className="auth-forest-mist absolute inset-0" />
                    <div
                        className="absolute inset-0 pointer-events-none transition ease-in-out duration-1300"
                        style={{
                            backgroundColor: `hsl(${getHueFromAccentColor(accentColor, appearance === 'dark')} 85% 52% / 0.25)`,
                            mixBlendMode: 'multiply',
                        }}
                    />
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    filter: backgroundType === 'orbs' ? 'blur(60px)' : 'none',
                    opacity: backgroundType === 'forest' ? 0 : 1,
                }}
            />
        </>
    );
};

export default AnimatedBackground;
