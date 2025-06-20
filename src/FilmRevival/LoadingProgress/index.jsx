import { LoadingDots } from "./LoadingDots";

export function LoadingProgress () {

  return (
    <div className="loading-overlay">
      <div className="loading-message">
        One moment please, we know it's slow, hang in there <LoadingDots />
      </div>
    </div>
  )
}