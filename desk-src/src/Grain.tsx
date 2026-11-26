import { useEffect, useRef } from 'react'

// Film grain over the whole page, scene and paper alike: a full-screen layer
// of moving RGB noise, blended soft-light at low opacity. After Henry
// Heffernan's overlay (henryjeff/portfolio-website, MIT). Still under
// reduced motion.
export function Grain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const uTime = gl.getUniformLocation(prog, 'u_time')

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const resize = () => {
      canvas.width = innerWidth
      canvas.height = innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const draw = (t: number) => {
      gl.uniform1f(uTime, Math.sin(t * 0.01))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!still) frame = requestAnimationFrame(draw)
    }
    resize()
    addEventListener('resize', resize)
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="grain" aria-hidden="true" />
}

const FRAG = `precision mediump float;
const float PHI = 1.61803398874989484820459;
uniform float u_time;
float noise(vec2 xy, float seed) { return fract(tan(distance(xy * PHI, xy) * seed) * xy.x); }
void main() {
  gl_FragColor = vec4(noise(gl_FragCoord.xy, fract(u_time) + 1.0),
                      noise(gl_FragCoord.xy, fract(u_time) + 2.0),
                      noise(gl_FragCoord.xy, fract(u_time) + 3.0), 1.0);
}`
