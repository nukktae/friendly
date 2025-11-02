import React from "react"
import { TextInputProps, TextStyle, ViewStyle } from "react-native"

type WebInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

type NativeInputProps = TextInputProps & {
  className?: string
  style?: ViewStyle | TextStyle
}

type InputProps = WebInputProps & NativeInputProps

export function Input({ className = "", style, ...props }: InputProps) {
  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const webProps = props as React.InputHTMLAttributes<HTMLInputElement>
    return (
      <input
        className={`px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${className}`}
        {...webProps}
      />
    )
  }
  
  // For React Native (mobile)
  const { TextInput } = require("react-native")
  const nativeProps = props as TextInputProps
  
  const defaultStyle = {
    height: 44,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "white",
  }
  
  return (
    <TextInput
      style={[defaultStyle, style]}
      placeholderTextColor="#888"
      {...nativeProps}
    />
  )
}
