# 설명 문구 작성 가이드라인 도입

프로젝트 내 설명 문구(Work `description`, Research `summary`/`findings`, Engineering Note `problem`/`approach`/`outcome`, 인터랙션 tooltip 등)를 명확하고 직관적인 한국어로 유지하기 위한 기준을 세우고, `humanize-korean` 스킬로 기존 문구를 점검·정리했다.

기존 문구를 전수 조사한 결과 대부분은 이미 짧고 직관적으로 쓰여 있었다. 인터랙션 tooltip 4건, KnitMuffler 난이도 설명, Stellar Forge·GoalsPassport 설명은 그대로 두었다 — 특히 Stellar Forge는 핵융합 반응식 등 정밀한 기술 수치를 포함하고 있어 의미가 훼손될 위험이 있는 곳은 손대지 않는 편이 낫다고 판단했다. 실제로 개선한 것은 번역투("~에 대해", "~를 통해"), 같은 단어·구의 근접 반복, "~할 수 있다/~것이다" 같은 불필요한 간접 표현 정도였다.

`humanize-korean` 스킬은 원래 긴 산문(칼럼·리포트) 한 편을 단일 입력으로 받아 멀티 에이전트 파이프라인(탐지 → 윤문 → 검증)으로 처리하도록 설계돼 있다. 코드베이스 곳곳에 흩어진 짧은 UI 문구에는 이 파이프라인을 그대로 돌리기보다, 스킬의 `quick-rules.md` 패턴표(번역투 A, 관용구 D, 접속사 남발 H 등)를 직접 기준으로 삼아 각 파일을 검토하는 방식이 더 적합했다.

## 앞으로의 기준

`CLAUDE.md`에 "Writing Guidelines" 섹션을 추가해 다음을 명시했다:

- 번역투 회피, 조사로 직결
- 같은 단어·구 반복 금지
- 단정 가능한 사실은 간접 표현 대신 단정형으로
- 고유명사·수치·기술 용어는 그대로 보존 (문체만 다듬고 의미는 바꾸지 않는다)
- 새 문구 작성/수정 시 `humanize-korean` 스킬(plugin: `im-not-ai/humanize-korean`) 원칙 참조

## 관련 코드

- `CLAUDE.md` — Writing Guidelines 섹션
- `app/(portfolio)/playground/_sections/Works/data.tsx` — Work description 정리
- `app/(portfolio)/interaction-lab/_sections/data.ts` — Research summary/findings 정리
- `app/(portfolio)/engineering-note/_sections/data.ts` — Engineering Note problem 정리
