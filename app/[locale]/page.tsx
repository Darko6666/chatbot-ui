"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="mt-2 text-4xl font-bold">Chatbot UI</div>

      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/login"
      >
        Start Chatting
        <IconArrowRight className="ml-1" size={20} />
      </Link>

      <Link
        className="mt-3 flex w-[260px] items-center justify-center rounded-md border border-blue-500 p-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/10"
        href="/chart-animator"
      >
        Atelier de graphiques animés
        <IconArrowRight className="ml-1" size={18} />
      </Link>
    </div>
  )
}
