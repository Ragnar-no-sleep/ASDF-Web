'use client'

import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR hydration issues with Framer Motion
const HubBackground = dynamic(() => import('@/components/HubBackground').then(mod => ({ default: mod.HubBackground })), {
  ssr: false,
})

const HubContent = dynamic(() => import('@/components/HubContent'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080503]">
      <HubBackground />
      <HubContent />
    </main>
  )
}
