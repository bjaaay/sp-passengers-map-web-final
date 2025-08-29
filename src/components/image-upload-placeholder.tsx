"use client"

import { useRef } from "react"
import { Link } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadPlaceholderProps {
  id: string
  label: string
  onFileChange: (file: File | null) => void
  className?: string
}

export function ImageUploadPlaceholder({
  id,
  label,
  onFileChange,
  className,
}: ImageUploadPlaceholderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleContainerClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    onFileChange(file)
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="font-semibold text-sm self-start">
        {label} <span className="text-red-500">*</span>
      </span>
      <div
        onClick={handleContainerClick}
        className="w-full aspect-square bg-muted/50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted"
      >
        <Link className="h-8 w-8 text-gray-400 mb-2" />
        <span className="text-gray-500 text-sm">Click to attach image</span>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
