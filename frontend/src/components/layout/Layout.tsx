import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex h-screen mesh-bg overflow-hidden">
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-7 pb-28 md:pb-8 max-w-5xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
