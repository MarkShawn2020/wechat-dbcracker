import { version } from '@renderer/version'

export function Versions(): JSX.Element {
  return (
    <div className="versions">
      <span>Wechater v{version}</span>
    </div>
  )
}
