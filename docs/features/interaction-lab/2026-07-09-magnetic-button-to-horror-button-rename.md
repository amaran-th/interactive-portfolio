# Magnetic Button → Horror Button 리네임

Interaction Lab에 있던 "Magnetic Button" 인터랙션의 이름을 "Horror Button"으로 변경했다. 단순 표시 문구 수정에서 그치지 않고, 폴더명·컴포넌트명까지 일관되게 맞추기 위해 전체 리네임을 진행했다.

`InteractionCard`에 전달하는 `title` prop만 바꾸는 방법도 있었지만, 코드베이스 내 이름(`MagneticCard`)과 실제 표시명(`Horror Button`)이 어긋나면 이후 유지보수 시 혼란을 줄 수 있어 폴더와 컴포넌트 이름도 함께 변경하기로 했다.

## 관련 코드
- `app/(portfolio)/playground/_sections/Interactions/2_HorrorButton/HorrorButton.tsx` — `2_MagneticCard/MagneticCard.tsx`에서 리네임, `title="Horror Button"`으로 수정
- `app/(portfolio)/playground/_sections/Interactions.tsx` — import 경로 및 `<HorrorButton />` 사용처 갱신
