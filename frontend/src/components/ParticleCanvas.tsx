import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  pulsePhase: number
}

const NODE_COUNT = 70
const MAX_DISTANCE = 150
const AMBER = '245, 166, 35'

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const nodes: Node[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const init = () => {
      nodes.length = 0
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 1,
          opacity: Math.random() * 0.4 + 0.3,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
    }

    const draw = (_time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        n.pulsePhase += 0.015

        // Bounce off edges
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        // Mouse repulsion (desktop)
        const dx = n.x - mouseRef.current.x
        const dy = n.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80) {
          const force = (80 - dist) / 80
          n.x += (dx / dist) * force * 2
          n.y += (dy / dist) * force * 2
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.25
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${AMBER}, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = Math.sin(n.pulsePhase) * 0.15
        const opacity = n.opacity + pulse
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${AMBER}, ${opacity})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    resize()
    init()
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', () => { resize(); init() })
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
