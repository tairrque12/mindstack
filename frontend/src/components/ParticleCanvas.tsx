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
  homeHub: number
}

const HUB_COUNT = 10
const SATELLITES_PER_HUB = 10
const MAX_DISTANCE = 150
const AMBER = '245, 166, 35'

/** Keep hub cluster tight so inter-hub lines stay within 150px on all viewports. */
function clusterRadius(w: number, h: number) {
  return Math.min(52, Math.min(w, h) * 0.13)
}

type Props = {
  dimmed?: boolean
  /** When true, render connections and nodes on separate canvases (Library/Capture use single canvas). */
  layered?: boolean
}

export default function ParticleCanvas({ dimmed = false, layered = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const connectionsRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = layered ? connectionsRef.current : canvasRef.current
    const nodesCanvas = layered ? nodesRef.current : canvasRef.current
    if (!canvas || !nodesCanvas) return

    const connCtx = canvas.getContext('2d')!
    const nodeCtx = layered ? nodesCanvas.getContext('2d')! : connCtx
    const nodes: Node[] = []

    const setupCanvas = (el: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1
      el.width = window.innerWidth * dpr
      el.height = window.innerHeight * dpr
      el.style.width = `${window.innerWidth}px`
      el.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const resize = () => {
      setupCanvas(canvas, connCtx)
      if (layered) setupCanvas(nodesCanvas, nodeCtx)
    }

    const init = () => {
      nodes.length = 0
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w * 0.5
      const cy = h * 0.48
      const radius = clusterRadius(w, h)

      for (let i = 0; i < HUB_COUNT; i++) {
        const angle = (i / HUB_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
        const dist = Math.random() * radius * 0.72 + radius * 0.08
        const r = Math.random() * 1.5 + 4.5
        nodes.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.035,
          vy: (Math.random() - 0.5) * 0.035,
          radius: r,
          baseRadius: r,
          opacity: Math.random() * 0.2 + 0.7,
          pulsePhase: Math.random() * Math.PI * 2,
          isHub: true,
          homeHub: i,
        })
      }

      for (let i = 0; i < HUB_COUNT; i++) {
        const hub = nodes[i]
        for (let j = 0; j < SATELLITES_PER_HUB; j++) {
          const angle = (j / SATELLITES_PER_HUB) * Math.PI * 2 + Math.random() * 0.4
          const orbit = Math.random() * 20 + 5
          const r = Math.random() + 1
          nodes.push({
            x: hub.x + Math.cos(angle) * orbit,
            y: hub.y + Math.sin(angle) * orbit,
            vx: (Math.random() - 0.5) * 0.08,
            vy: (Math.random() - 0.5) * 0.08,
            radius: r,
            baseRadius: r,
            opacity: Math.random() * 0.3 + 0.3,
            pulsePhase: Math.random() * Math.PI * 2,
            isHub: false,
            homeHub: i,
          })
        }
      }
    }

    const updatePositions = (w: number, h: number) => {
      const cx = w * 0.5
      const cy = h * 0.48
      const bound = clusterRadius(w, h) * 1.15

      for (const n of nodes) {
        if (!n.isHub) {
          const hub = nodes[n.homeHub]
          const hdx = hub.x - n.x
          const hdy = hub.y - n.y
          const hdist = Math.sqrt(hdx * hdx + hdy * hdy) || 1
          if (hdist > 32) {
            n.vx += (hdx / hdist) * 0.02
            n.vy += (hdy / hdist) * 0.02
          }
        } else {
          const dx = cx - n.x
          const dy = cy - n.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist > bound) {
            n.vx += (dx / dist) * 0.01
            n.vy += (dy / dist) * 0.01
          }
        }

        n.vx *= 0.992
        n.vy *= 0.992
        n.x += n.vx
        n.y += n.vy
        n.pulsePhase += n.isHub ? 0.005 : 0.01

        if (n.x < 8) { n.x = 8; n.vx = Math.abs(n.vx) * 0.5 }
        if (n.x > w - 8) { n.x = w - 8; n.vx = -Math.abs(n.vx) * 0.5 }
        if (n.y < 8) { n.y = 8; n.vy = Math.abs(n.vy) * 0.5 }
        if (n.y > h - 8) { n.y = h - 8; n.vy = -Math.abs(n.vy) * 0.5 }

        if (n.isHub) {
          n.radius = n.baseRadius + Math.sin(n.pulsePhase) * 1.2
        }

        const dx = n.x - mouseRef.current.x
        const dy = n.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 72 && dist > 0) {
          const force = (72 - dist) / 72
          n.x += (dx / dist) * force * 1.2
          n.y += (dy / dist) * force * 1.2
        }
      }
    }

    const drawConnections = (ctx: CanvasRenderingContext2D) => {
      ctx.lineWidth = 0.5
      ctx.lineCap = 'round'
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.15
            ctx.strokeStyle = `rgba(${AMBER}, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const drawNodes = (ctx: CanvasRenderingContext2D) => {
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        const fillAlpha = n.isHub ? Math.min(n.opacity + 0.12, 0.95) : n.opacity
        ctx.fillStyle = `rgba(${AMBER}, ${fillAlpha})`
        ctx.fill()
      }
    }

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      updatePositions(w, h)

      connCtx.clearRect(0, 0, w, h)
      drawConnections(connCtx)

      if (layered) {
        nodeCtx.clearRect(0, 0, w, h)
        drawNodes(nodeCtx)
      } else {
        drawNodes(connCtx)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onResize = () => {
      resize()
      init()
    }

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
  }, [layered])

  const opacity = dimmed ? 0.2 : 1

  if (layered) {
    return (
      <>
        <canvas
          ref={connectionsRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 5, opacity }}
          aria-hidden
        />
        <canvas
          ref={nodesRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 6, opacity }}
          aria-hidden
        />
      </>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity }}
      aria-hidden
    />
  )
}
