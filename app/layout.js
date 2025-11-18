export const metadata = {
  title: 'Proximity Planner',
  description: 'Display and plan your events for the day on our interactive map interface.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
