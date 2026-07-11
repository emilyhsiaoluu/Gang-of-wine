"use client"

import { useEffect } from "react"
import { Wine } from "lucide-react"
import { Button } from "@/components/ui/button"

// Route-level error boundary: catches client-side crashes that would
// otherwise leave members staring at a broken page, shows a friendly
// fallback, and reports the error to PostHog so the owner gets alerted.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Client crash:", error)
    import("posthog-js").then(({ default: ph }) =>
      ph.capture("client_crash", {
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 2000),
        url: window.location.href,
      }),
    )
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Wine className="h-10 w-10 mx-auto text-primary mb-4" />
        <h1 className="font-serif text-2xl text-foreground mb-2">
          Well, that&apos;s a spill 🍷
        </h1>
        <p className="text-muted-foreground mb-6">
          Something broke on our end. It&apos;s been reported — try reloading, and if it
          keeps happening, tell Emily.
        </p>
        <Button size="lg" className="h-12 px-8" onClick={() => reset()}>
          Reload
        </Button>
      </div>
    </div>
  )
}
