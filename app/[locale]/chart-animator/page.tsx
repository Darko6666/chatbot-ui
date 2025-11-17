"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  IconPause,
  IconPlayerPlay,
  IconRefresh,
  IconUpload
} from "@tabler/icons-react"
import Image from "next/image"

interface ChartPoint {
  id: string
  x: number
  y: number
}

type AnimationState = "idle" | "running" | "paused"

export default function ChartAnimatorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [pathLength, setPathLength] = useState(0)
  const [animationState, setAnimationState] = useState<AnimationState>("idle")
  const [speed, setSpeed] = useState(120)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)

  const pathD = useMemo(() => {
    if (points.length === 0) return ""
    const [first, ...rest] = points
    const start = `M ${first.x}% ${first.y}%`
    const segments = rest.map(point => `L ${point.x}% ${point.y}%`).join(" ")

    return `${start} ${segments}`.trim()
  }, [points])

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength()
      setPathLength(length)
    } else {
      setPathLength(0)
    }
  }, [pathD])

  const cancelAnimationFrameIfNeeded = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }

  useEffect(() => {
    cancelAnimationFrameIfNeeded()
    setAnimationState("idle")
    setProgress(0)
    lastTimestampRef.current = null
    isAnimatingRef.current = false
  }, [pathD])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loadEvent => {
      setImageSrc(loadEvent.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const getRelativeCoordinates = (event: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null

    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    }
  }

  const findNearestPoint = useCallback(
    (event: React.PointerEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return null

      let nearest: ChartPoint | null = null
      let minDistance = Infinity

      for (const point of points) {
        const px = (point.x / 100) * rect.width
        const py = (point.y / 100) * rect.height
        const dx = event.clientX - rect.left - px
        const dy = event.clientY - rect.top - py
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < minDistance) {
          minDistance = distance
          nearest = point
        }
      }

      return minDistance < 18 ? nearest : null
    },
    [points]
  )

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    const nearest = findNearestPoint(event)

    if (nearest) {
      setDraggingId(nearest.id)
      return
    }

    const relative = getRelativeCoordinates(event)
    if (!relative) return

    const newPoint: ChartPoint = {
      id: crypto.randomUUID(),
      x: relative.x,
      y: relative.y
    }
    setPoints(prev => [...prev, newPoint])
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!draggingId) return
    const relative = getRelativeCoordinates(event)
    if (!relative) return

    setPoints(prev =>
      prev.map(point =>
        point.id === draggingId
          ? {
              ...point,
              x: relative.x,
              y: relative.y
            }
          : point
      )
    )
  }

  const stopDragging = () => {
    setDraggingId(null)
  }

  const startAnimation = () => {
    if (points.length < 2 || pathLength === 0) return
    isAnimatingRef.current = true
    setAnimationState("running")

    const step = (timestamp: number) => {
      if (!isAnimatingRef.current) return

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }

      const deltaSeconds = (timestamp - (lastTimestampRef.current ?? 0)) / 1000
      lastTimestampRef.current = timestamp

      setProgress(prev => {
        const distance = speed * deltaSeconds
        const deltaProgress = pathLength > 0 ? distance / pathLength : 0
        const next = Math.min(1, prev + deltaProgress)
        if (next >= 1) {
          setAnimationState("paused")
          cancelAnimationFrameIfNeeded()
          isAnimatingRef.current = false
        }
        return next
      })

      if (isAnimatingRef.current) {
        frameRef.current = requestAnimationFrame(step)
      }
    }

    cancelAnimationFrameIfNeeded()
    frameRef.current = requestAnimationFrame(step)
  }

  const pauseAnimation = () => {
    cancelAnimationFrameIfNeeded()
    setAnimationState("paused")
    lastTimestampRef.current = null
    isAnimatingRef.current = false
  }

  const resetAnimation = () => {
    cancelAnimationFrameIfNeeded()
    setProgress(0)
    setAnimationState("idle")
    lastTimestampRef.current = null
    isAnimatingRef.current = false
  }

  const animatedMarker = useMemo(() => {
    if (!pathRef.current || pathLength === 0 || progress <= 0) return null
    const point = pathRef.current.getPointAtLength(pathLength * progress)
    return {
      x: point.x,
      y: point.y
    }
  }, [pathLength, progress])

  return (
    <div className="flex size-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
          Studio de graphiques animés
        </p>
        <h1 className="text-3xl font-bold">
          Dessinez, animez et exportez vos courbes
        </h1>
        <p className="text-muted-foreground max-w-4xl text-sm">
          Importez une image de référence, placez vos points directement à la
          souris pour créer une courbe, puis animez-la avec les contrôles
          lecture/pause et réinitialisation. Chaque point peut être déplacé en
          drag &amp; drop pour ajuster la trajectoire.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconUpload size={18} />
                <span>Zone de travail</span>
              </div>
              <label className="bg-primary text-primary-foreground cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition hover:opacity-90">
                Importer une image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div
              className="relative flex min-h-[520px] items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerLeave={stopDragging}
            >
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt="Support du graphique"
                  fill
                  className="object-contain"
                  sizes="(min-width: 1280px) 70vw, 100vw"
                />
              ) : (
                <div className="text-muted-foreground pointer-events-none flex flex-col items-center gap-2 text-center text-sm">
                  <span className="border-border rounded-full border border-dashed px-4 py-2 text-xs uppercase tracking-[0.2em] text-sky-300">
                    Déposez une image ou cliquez pour en importer
                  </span>
                  <p>
                    Ajoutez une image de référence pour caler votre courbe
                    animée.
                  </p>
                </div>
              )}

              <svg
                ref={svgRef}
                className="absolute inset-4 z-10 size-[calc(100%-2rem)] cursor-crosshair rounded-lg border border-white/10 bg-black/10"
                onPointerDown={handlePointerDown}
              >
                {points.length > 0 && (
                  <>
                    <path
                      ref={pathRef}
                      d={pathD}
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={pathLength}
                      strokeDashoffset={pathLength - pathLength * progress}
                    />
                    <defs>
                      <linearGradient
                        id="gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </>
                )}

                {points.map(point => (
                  <g
                    key={point.id}
                    className="cursor-grab"
                    onPointerDown={() => setDraggingId(point.id)}
                  >
                    <circle
                      cx={`${point.x}%`}
                      cy={`${point.y}%`}
                      r={10}
                      fill="rgba(56,189,248,0.2)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                    />
                    <circle
                      cx={`${point.x}%`}
                      cy={`${point.y}%`}
                      r={4}
                      fill="#0ea5e9"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  </g>
                ))}

                {animatedMarker && (
                  <circle
                    cx={animatedMarker.x}
                    cy={animatedMarker.y}
                    r={8}
                    fill="#22d3ee"
                    stroke="white"
                    strokeWidth={2}
                    className="drop-shadow-xl"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">
              Contrôles d&apos;animation
            </h2>
            <p className="text-muted-foreground text-sm">
              Ajustez la vitesse, lancez, mettez en pause ou revenez au début.
              La progression suit la longueur totale de votre courbe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startAnimation}
              disabled={points.length < 2}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconPlayerPlay size={18} />
              Lancer
            </button>
            <button
              type="button"
              onClick={pauseAnimation}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={animationState !== "running" && progress === 0}
            >
              <IconPause size={18} />
              Pause
            </button>
            <button
              type="button"
              onClick={resetAnimation}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <IconRefresh size={18} />
              Reset
            </button>
          </div>

          <div className="border-border bg-background/60 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Vitesse de tracé</span>
              <span className="text-muted-foreground">
                {speed.toFixed(0)} px/s
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={300}
              step={10}
              value={speed}
              onChange={event => setSpeed(Number(event.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="border-border bg-background/60 space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between font-semibold">
              <span>Progression</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="bg-muted h-2 w-full rounded-full">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-muted-foreground">
              Cliquez dans la zone pour ajouter un point. Maintenez et déplacez
              un point pour affiner la trajectoire.
            </p>
            <p className="text-muted-foreground">
              Une fois au moins deux points placés, utilisez les boutons pour
              prévisualiser votre courbe animée.
            </p>
          </div>

          <div className="border-border bg-background/60 space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between font-semibold">
              <span>Points actifs</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-sky-200">
                {points.length}
              </span>
            </div>
            {points.length === 0 ? (
              <p className="text-muted-foreground">
                Ajoutez des points pour définir la courbe.
              </p>
            ) : (
              <ul className="text-muted-foreground space-y-1">
                {points.map((point, index) => (
                  <li
                    key={point.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/60 px-2 py-1"
                  >
                    <span className="text-foreground font-medium">
                      Point {index + 1}
                    </span>
                    <span className="text-xs">
                      x: {point.x.toFixed(1)}% · y: {point.y.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
