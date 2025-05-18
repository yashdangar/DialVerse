import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"

export const metadata = {
  title: "Calling Management System",
  description: "A modern web application for managing calls",
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Calling Management System
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    A modern, clean, and user-friendly web application for managing your calls, recordings, and
                    transcriptions.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/dialer">
                    <Button size="lg" className="gap-1">
                      <Phone className="h-4 w-4" />
                      Start Calling
                    </Button>
                  </Link>
                  <Link href="/numbers">
                    <Button size="lg" variant="outline">
                      View Numbers
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[450px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-muted/50 to-muted p-6 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-b from-muted/80 to-muted/20 opacity-70"></div>
                  <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-4 text-center">
                    <Phone className="h-16 w-16 text-primary" />
                    <h2 className="text-2xl font-bold">Manage Your Calls</h2>
                    <p className="text-muted-foreground">
                      Make calls, view history, listen to recordings, and analyze transcriptions all in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
