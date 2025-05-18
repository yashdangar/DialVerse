export default function Loading() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Web Dialer</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <div className="w-full h-[500px] rounded-lg border bg-card animate-pulse"></div>
        <div className="w-full h-[500px] rounded-lg border bg-card animate-pulse"></div>
      </div>
    </div>
  )
}
