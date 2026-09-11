import {
  siNextdotjs,
  siReact,
  siTypescript,
  siTailwindcss,
  siZod,
  siReacthookform,
  siRadixui,
  siTanstack,
  siPuppeteer,
  siYaml,
  siNodedotjs,
  siExpress,
  siPino,
  siNx,
  siDocker,
  siPulumi,
  siGooglecloud,
} from 'simple-icons'

const STACK = [
  { name: 'Next.js', icon: siNextdotjs },
  { name: 'React', icon: siReact },
  { name: 'TypeScript', icon: siTypescript },
  { name: 'Tailwind CSS', icon: siTailwindcss },
  { name: 'Zod', icon: siZod },
  { name: 'React Hook Form', icon: siReacthookform },
  { name: 'Radix UI', icon: siRadixui },
  { name: 'TanStack Query', icon: siTanstack },
  { name: 'Puppeteer', icon: siPuppeteer },
  { name: 'YAML', icon: siYaml },
  { name: 'Node.js', icon: siNodedotjs },
  { name: 'Express', icon: siExpress },
  { name: 'Pino', icon: siPino },
  { name: 'Nx', icon: siNx },
  { name: 'Docker', icon: siDocker },
  { name: 'Pulumi', icon: siPulumi },
  { name: 'Google Cloud', icon: siGooglecloud },
] as const

export function TechStack() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Built with</h2>
      <p className="mt-1 text-gray-400">
        The stack behind this app, end to end.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        {STACK.map(({ name, icon }) => (
          <div key={name} className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 p-2">
              <svg viewBox="0 0 24 24" fill={`#${icon.hex}`}>
                <title>{icon.title}</title>
                <path d={icon.path} />
              </svg>
            </div>
            <span className="text-xs text-gray-400">{name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
