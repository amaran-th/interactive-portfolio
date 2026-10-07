import { Eraser, Paintbrush, RefreshCw } from "lucide-react";

// 이비스페인트의 펜/지우개 전환 버튼 아이콘을 참고한 합성 아이콘 — 순환
// 화살표(대각선 한쪽) 안에 붓(좌상단)과 지우개(우하단)를 겹쳐, "이 둘을
// 오간다"는 뜻을 한 아이콘으로 보여준다. lucide 기본 세트엔 이 모양이
// 없어 세 아이콘을 겹쳐 직접 구성했다 — 펜/지우개 토글 버튼처럼 상태와
// 무관하게 아이콘 모양 자체는 항상 고정이어야 할 때 쓴다.
export default function PenEraserIcon({ className }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className ?? "h-5 w-5"}`}>
      <RefreshCw className="absolute inset-0 h-full w-full" strokeWidth={2} />
      <Paintbrush
        className="absolute -top-0.5 -left-0.5 h-1/2 w-1/2"
        strokeWidth={2.5}
      />
      <Eraser
        className="absolute -right-0.5 -bottom-0.5 h-1/2 w-1/2"
        strokeWidth={2.5}
      />
    </span>
  );
}
