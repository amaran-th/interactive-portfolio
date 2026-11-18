# 조명 연습실 — 라인 옮기기·평면도·관객·좌석 고르기

조명 세팅을 더 간편하게 하고, 배치를 위에서 내려다보며 다룰 수 있게 했다. 객석에는 관객을 앉히고, 보는 좌석을 정확히 고를 수 있게 했다.

## 라인 옮기기와 세팅 도우미

- 라인(FOH·일렉트릭·붐·바닥)은 `Stage.rig[hang] = { dz, dy }`로 기본 위치에서 옮긴 거리를 저장한다. `hangPoint`가 이 값을 더하므로 걸린 조명기는 따로 고치지 않아도 따라간다. 무대 크기를 바꿔도 옮긴 거리는 그대로라 배치가 함께 움직인다. 예전 저장본은 0으로 읽는다.
- 3D 화면에서 파이프를 끌면 앞뒤로, Shift를 누른 채 끌면 높이(붐은 무대와의 거리)가 바뀐다. 광선과 수평면·수직면의 교점(`rayAtY`·`rayAtZ`)으로 이동량을 잰다.
- 라인을 고르면 3D에 강조 막대를 겹쳐 그린다(마우스 올림은 옅은 노랑, 고름·끄는 중은 진한 주황, `depthTest: false`). 끄는 동안 포인터 옆에 라인 이름과 수치를 띄운다.
- 조명기를 고르지 않았을 때 조명기 탭에 라인 패널이 나온다. 라인마다 앞뒤·높이 입력, '고르게 펼치기'(`spreadLine`), '가운데 비추기', '기본 위치로'가 있고, 맨 위의 '기본 조명 배치 걸기'(`addPresetRig`)는 앞조명 2·윗조명 3·역광 2·호리존트 1대를 빈 채널로 더 건다.
- 조명기 속성의 '가운데 비추기'·'가까운 인물 비추기'(`aimFixtures`)는 버튼 하나로 조준한다. 팔로우 스팟은 지금 큐 값의 대상을 바꾼다.

## 평면도 창

실제 조명 프로그램은 평면도에서 배치하고 3D로 확인한다. 웹에서 입문자가 쓰는 도구라 4분할 대신 3D 화면 하나에 평면도 창을 더했다.

- 3D를 다시 렌더링하지 않고 쇼 데이터로 SVG를 그린다. viewBox를 월드 x·z 좌표 그대로 쓰고, 포인터 좌표는 `getScreenCTM().inverse()`로 되돌린다.
- 무대 바닥, 라인, 채널 번호가 적힌 조명기, 조준선, 빛이 닿는 자리(빔 각도로 계산한 원, 밝을수록 진하게), 인물, 소품을 그린다. 붐은 위에서 보면 점이라 높이를 앞뒤 막대로 펼쳐 그린다(`fixtureMapPoint`).
- 조명기는 가장 가까운 라인으로(`hangFromMap`, 지금 라인은 0.6m 더 붙잡음), 라인은 앞뒤로(`dragLineOnMap`), 조준점·인물·소품은 평면으로 끈다. 끄는 동안은 3D 미리보기만 하고 놓을 때 저장한다.
- 작게 띄우기 / 넓은 화면에서 화면 반 나눠 보기 / 닫기를 고른다. 3D '플롯' 시점에서는 작은 창을 숨긴다.

## 객석 관객

- 툴바 '관객'으로 켜고 끈다(저장하지 않음). 좌석 순번으로 정한 모습(`audienceMember`: 성별·키·옷·피부·머리 색)이라 다시 그려도 같은 사람이 앉고, 객석 시점으로 보는 자리는 비운다.
- 성별마다 몸체·머리카락 InstancedMesh 하나씩만 쓴다. 사람마다 다른 색은 복제한 지오메트리에 `InstancedBufferAttribute`(aSkin·aTop)를 붙여 셰이더에서 읽고, 머리 색은 `setColorAt`으로 준다.
- 사람 모델은 1명 약 1만 5천 삼각형(중극장 318석이면 약 500만)이라 품질 0단계에서만 쓰고, 품질이 내려가면 약 3천 삼각형 마네킹으로 바꾼다. 그림자는 드리우지도 받지도 않는다.

## 좌석 고르기

- 좌석 미리보기 창(좁은 화면은 무대 설정 탭)에 구역 드롭다운, 열·번호 입력과 ± 단추, 방향 단추를 두었다. 객석 시점에서는 키보드 방향키로도 옮긴다.
- `stepSeat`은 번호가 아니라 실제 위치로 다음 좌석을 찾는다. 관객이 무대를 보는 방향 기준 왼쪽·오른쪽·앞·뒤에서 (진행 거리 + 옆 어긋남 × 3)이 가장 작은 좌석을 고르고, 같은 층(1층·발코니) 안에서만 움직인다. 줄 끝에서는 통로 건너 옆 구역으로 넘어간다.

## 검증

- 순수 함수는 `show.test.mts`·`plotMap.test.mts`·`seatNav.test.mts`로 테스트한다(조명 연습실 테스트 85개).
- 헤드리스 Playwright에서는 `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`로 띄워야 페이지가 죽지 않는다. CPU 렌더링이라 사람 모델 관객 수백 명은 그리지 못해 품질 '낮음'(마네킹)으로 확인했다. 자동 저장은 지연되므로 저장값은 약 3초 뒤에 읽는다.

## 관련 코드
- `apps/services/components/works/11_StageLighting/show.ts` — `rig`·`setLineOffset`·`spreadLine`·`aimFixtures`·`addPresetRig`·평면도 좌표 함수
- `apps/services/components/works/11_StageLighting/LinePanel.tsx` — 라인 패널
- `apps/services/components/works/11_StageLighting/PlotMap.tsx` — 평면도 창
- `apps/services/components/works/11_StageLighting/scene/audience.ts` — 관객 InstancedMesh 레이어
- `apps/services/components/works/11_StageLighting/SeatSelect.tsx` — 구역·열·번호·방향 좌석 고르기
- `apps/services/components/works/11_StageLighting/venue.ts` — `stepSeat`·`audienceMember`
- `apps/services/components/works/11_StageLighting/useStageScene.ts` — 라인 고르기·강조, 관객 레이어 연결
