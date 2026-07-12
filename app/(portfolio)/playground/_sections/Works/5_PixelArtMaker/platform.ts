// 단축키 표시를 Mac(⌘)과 Windows/Linux(Ctrl)에 맞게 다르게 보여주기 위한 감지.
// navigator.userAgentData는 Chromium 계열에서만 있어 우선 시도하고,
// 없으면 구식이지만 여전히 널리 지원되는 navigator.platform으로 대체한다.
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaDataPlatform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData
    ?.platform;
  const platform = uaDataPlatform ?? navigator.platform ?? navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(platform);
}
