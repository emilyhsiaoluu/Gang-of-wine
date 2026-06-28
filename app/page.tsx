import type { Metadata } from "next"
import { ClientPage } from "@/components/client-page"

type Props = { searchParams: Promise<{ ogImage?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { ogImage } = await searchParams
  if (!ogImage) return {}
  const decoded = decodeURIComponent(ogImage)
  return {
    openGraph: { images: [{ url: decoded, width: 200, height: 300, alt: "Book cover" }] },
    twitter: { images: [decoded] },
  }
}

export default function Home() {
  return <ClientPage />
}
