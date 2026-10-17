import React from 'react'

/**
 * Marca gráfica da Afrodite: um ícone estilizado de concha (leque de linhas).
 * `color` aceita qualquer cor CSS; `size` em px.
 */
export default function BrandMark({ size = 48, color = '#fff', strokeWidth = 2.4 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 54C18 54 8 44 8 30C8 30 18 32 20 24C20 24 24 32 32 32C40 32 44 24 44 24C46 32 56 30 56 30C56 44 46 54 32 54Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M32 32V54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 24C22 34 26 44 32 54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M44 24C42 34 38 44 32 54" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M32 32C32 32 30 18 20 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M32 32C32 32 34 18 44 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx="20" cy="12" r="2.6" fill={color} />
      <circle cx="44" cy="12" r="2.6" fill={color} />
    </svg>
  )
}
