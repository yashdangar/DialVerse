export default function Loading() {
  return (
    <div className="container py-10">
      <div className="flex flex-col gap-2 mb-8">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md"></div>
        <div className="h-6 w-48 bg-muted animate-pulse rounded-md"></div>
      </div>

      <div className="space-y-6">
        <div className="w-full h-[200px] rounded-lg border bg-card animate-pulse"></div>
        <div className="w-full h-[500px] rounded-lg border bg-card animate-pulse"></div>
      </div>
    </div>
  )
}
