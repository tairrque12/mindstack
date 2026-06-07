import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseRadius: number
  opacity: number
  pulsePhase: number
  isHub: boolean
}

const NODE_COUNT = 75
const HUB_COUNT = 9
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
      for (let i = 0; i < HUB_COUNT; i++) {
        const r = Math.random() * 1.5 + 3.5
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: r,
          baseRadius: r,
          opacity: Math.random() * 0.3 + 0.5,
          pulsePhase: Math.random() * Math.PI * 2,
          isHub: true,
        })
      }
      for (let i = 0; i < NODE_COUNT; i++) {
        const r = Math.random() * 1.5 + 1
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: r,
          baseRadius: r,
          opacity: Math.random() * 0.6 + 0.2,
          pulsePhase: Math.random() * Math.PI * 2,
          isHub: false,
        })
      }
    }

    const draw = (_time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        n.pulsePhase += n.isHub ? 0.008 : 0.015

        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        if (n.isHub) {
          n.radius = n.baseRadius + Math.sin(n.pulsePhase) * 0.8
        }

        const dx = n.x - mouseRef.current.x
        const dy = n.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80 && dist > 0) {
          const force = (80 - dist) / 80
          n.x += (dx / dist) * force * 2
          n.y += (dy / dist) * force * 2
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DISTANCE) {
            const hubBoost = nodes[i].isHub || nodes[j].isHub ? 1.5 : 1
            const alpha = (1 - dist / MAX_DISTANCE) * 0.25 * hubBoost
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${AMBER}, ${alpha})`
            ctx.lineWidth = nodes[i].isHub || nodes[j].isHub ? 0.7 : 0.5
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        const pulse = n.isHub ? 0 : Math.sin(n.pulsePhase) * 0.15
        const opacity = Math.min(0.95, n.opacity + pulse)
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

    const onResize = () => { resize(); init() }

    resize()
    init()
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
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
