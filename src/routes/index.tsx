import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="app-shell">
      <p className="eyebrow">DEFF-ACC</p>
      <h1>Passive Municipal Cyber Risk Map</h1>
      <p>
        A minimal TanStack Start shell ready for the municipal risk dashboard,
        Convex data layer, and passive scanning workflow.
      </p>
    </main>
  )
}
