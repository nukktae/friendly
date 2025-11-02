import React from "react"

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string
  children: React.ReactNode
}

export function Label({ className = "", children, ...props }: LabelProps) {
  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return (
      <label
        className={`text-sm font-medium mb-1 text-gray-900 ${className}`}
        {...props}
      >
        {children}
      </label>
    )
  }

  // For React Native (mobile)
  const { Text } = require("react-native")
  return (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 4,
        color: "#111",
      }}
      {...props}
    >
      {children}
    </Text>
  )
}
