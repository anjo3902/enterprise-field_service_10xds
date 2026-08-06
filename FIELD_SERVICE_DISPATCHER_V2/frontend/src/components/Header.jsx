import { Wrench } from 'lucide-react'

const Header = () => {
  return (
    <header className="bg-card border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2 rounded-lg">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">
              AI Field Service Diagnosis
            </h1>
            <p className="text-sm text-secondary">
              Intelligent maintenance issue detection and routing
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
