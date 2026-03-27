"use client"

import { useEffect, useRef, useState } from "react"

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
  delay?: 0 | 1 | 2 | 3
}

const DELAY_CLASSES = {
  0: "animate-fade-in-up",
  1: "animate-fade-in-up-delay-1",
  2: "animate-fade-in-up-delay-2",
  3: "animate-fade-in-up-delay-3",
} as const

export function AnimateOnScroll({
  children,
  className = "",
  delay = 0,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? DELAY_CLASSES[delay] : "opacity-0"}`}
    >
      {children}
    </div>
  )
}
