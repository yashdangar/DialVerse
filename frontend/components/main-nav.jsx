import Link from "next/link"
import { Phone, List, FileText } from "lucide-react"

export function MainNav() {
  return (
    <div className="flex w-full items-center justify-between">
      <Link href="/" className="flex items-center space-x-2">
        <Phone className="h-6 w-6" />
        <span className="font-bold">CMS</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link href="/dialer" className="transition-colors hover:text-foreground/80 text-foreground/60">
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            <span>Dialer</span>
          </div>
        </Link>
        <Link href="/numbers" className="transition-colors hover:text-foreground/80 text-foreground/60">
          <div className="flex items-center gap-1">
            <List className="h-4 w-4" />
            <span>Numbers</span>
          </div>
        </Link>
        <Link href="/calls" className="transition-colors hover:text-foreground/80 text-foreground/60">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>Call Details</span>
          </div>
        </Link>
      </nav>
    </div>
  )
}
