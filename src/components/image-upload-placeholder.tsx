"use client"

import { useRef, useState, useEffect } from "react"
import { Link, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface ImageUploadPlaceholderProps {
  id: string
  label: string
  onFileChange: (file: File | null) => void
  className?: string
  value?: File | null
}

export function ImageUploadPlaceholder({
  id,
  label,
  onFileChange,
  className,
  value,
}: ImageUploadPlaceholderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (value) {
      const objectUrl = URL.createObjectURL(value)
      setImagePreview(objectUrl)

      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setImagePreview(null)
    }
  }, [value])

  const handleContainerClick = () => {
    if (!imagePreview) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    onFileChange(file)
  }

  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onFileChange(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="font-semibold text-sm self-start">
        {label} <span className="text-red-500">*</span>
      </span>
      <div
        onClick={handleContainerClick}
        className={cn(
          "w-full aspect-square bg-muted/50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted relative",
          { "cursor-default": imagePreview }
        )}
      >
        {imagePreview ? (
          <>
            <Image
              src={imagePreview}
              alt="Image preview"
              fill
              className="object-contain rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Link className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-gray-500 text-sm">Click to attach image</span>
          </>
        )}
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
