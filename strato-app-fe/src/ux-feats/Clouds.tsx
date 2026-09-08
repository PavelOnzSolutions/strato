import React, { useRef, useEffect } from 'react';
import './Clouds.css';

interface CloudsProps {
    hue?: number;
    speed?: number;
    density?: number;
}

const Clouds: React.FC<CloudsProps> = ({ hue = 200, speed = 1, density = 1 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
            canvas.width = Math.floor(canvas.clientWidth * dpr);
            canvas.height = Math.floor(canvas.clientHeight * dpr);
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

        const fragmentShaderSource = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uSpeed;
      uniform float uDensity;

      float hash(vec3 p) {
          p = fract(p * vec3(.1031, .1030, .0973));
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
      }

      float noise(vec3 x) {
          vec3 p = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
                         mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
                         mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
          float f = 0.0;
          f += 0.5000 * noise(p); p = p * 2.02;
          f += 0.2500 * noise(p); p = p * 2.03;
          f += 0.1250 * noise(p);
          return f;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.y, iResolution.x);
          
          vec3 ro = vec3(0.0, 3.5, iTime * 2.5 * uSpeed); 
          vec3 rd = normalize(vec3(uv, 1.0));
          
          float pitch = -0.4;
          mat3 rot = mat3(1, 0, 0, 0, cos(pitch), -sin(pitch), 0, sin(pitch), cos(pitch));
          rd = rot * rd;

          // REALISTIC COLORS: Natural blue sky gradient
          vec3 skyZenith = vec3(0.1, 0.35, 0.7); // Deep blue at top
          vec3 skyHorizon = vec3(0.6, 0.8, 0.95); // Light blue at horizon
          vec3 skyColor = mix(skyHorizon, skyZenith, clamp(rd.y * 2.0 + 0.5, 0.0, 1.0));
          
          vec4 sum = vec4(0.0);
          float t = 0.1;
          for (int i = 0; i < 20; i++) {
              if (sum.a > 0.9 || t > 20.0) break;
              vec3 pos = ro + rd * t;
              
              float den = fbm(pos * 0.4 + iTime * 0.03 * uSpeed);
              den = smoothstep(0.4, 0.9, den * uDensity);
              den *= smoothstep(4.0, 1.0, pos.y); 
              
              if (den > 0.01) {
                  float dif = clamp((den - fbm(pos * 0.4 + vec3(0,0.5,0))) / 0.5, 0.0, 1.0);
                  
                  // REALISTIC COLORS: Soft gray/white clouds
                  vec3 cloudCol = mix(vec3(0.7, 0.75, 0.8), vec3(1.0, 1.0, 1.0), den);
                  cloudCol *= mix(skyColor, vec3(1.0), 0.5) + vec3(0.4, 0.5, 0.6) * dif;
                  
                  vec4 col = vec4(cloudCol, den * 0.75);
                  col.rgb *= col.a;
                  sum += col * (1.0 - sum.a);
              }
              t += max(0.4, 0.1 * t);
          }

          vec3 finalColor = mix(skyColor, sum.rgb, sum.a);
          
          // Atmospheric distance fog
          finalColor = mix(finalColor, skyHorizon, smoothstep(10.0, 20.0, t));

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

        const compileShader = (source: string, type: number): WebGLShader | null => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
        const iTimeLocation = gl.getUniformLocation(program, 'iTime');
        const uHueLocation = gl.getUniformLocation(program, 'uHue');
        const uSpeedLocation = gl.getUniformLocation(program, 'uSpeed');
        const uDensityLocation = gl.getUniformLocation(program, 'uDensity');

        const startTime = performance.now();
        let animationFrameId: number;

        const render = (time: number) => {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(iTimeLocation, (time - startTime) / 1000.0);
            gl.uniform1f(uHueLocation, hue);
            gl.uniform1f(uSpeedLocation, speed);
            gl.uniform1f(uDensityLocation, density);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameId = requestAnimationFrame(render);
        };
        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [hue, speed, density]);

    return <canvas ref={canvasRef} className="clouds-container" />;
};

export default Clouds;
