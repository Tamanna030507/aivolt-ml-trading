import AIStatusBar from '@/components/layout/AIStatusBar'
import LiveTicker from '@/components/layout/LiveTicker'
import Sidebar from '@/components/layout/Sidebar'
import ModeBanner from '@/components/layout/ModeBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ModeBanner />
      <AIStatusBar />
      <LiveTicker />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-bg-primary grid-bg">
          {children}
        </main>
      </div>
    </div>
  )
}
