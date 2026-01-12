'use client'

import { useState, useEffect, useCallback } from 'react'

const ENTRANCE_DURATION = 2550 // Total entrance animation duration in ms
const BASE_DELAY = 100 // Initial delay before starting
const STAGGER = 200 // Delay between each element

export function useHubEntrance() {
  const [mounted, setMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Mark as mounted immediately
    setMounted(true)

    // Mark as ready after all animations complete
    const readyTimer = setTimeout(() => {
      setIsReady(true)
    }, ENTRANCE_DURATION)

    return () => {
      clearTimeout(readyTimer)
    }
  }, [])

  // Get staggered delay for each element - only after mount
  const getDelay = useCallback((index: number) => {
    if (!mounted) return 0
    return BASE_DELAY + index * STAGGER
  }, [mounted])

  return {
    isReady,
    mounted,
    getDelay,
  }
}
