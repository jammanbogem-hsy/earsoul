# 작업 상태: 9개 요청 모두 반영 완료 (커밋 전)

브랜치: `codex/gameplay-growth-hazards` · 검증: `tsc -b`, `eslint src`, `vitest`(150개), `vite build` 모두 통과

| # | 요청 | 반영 내용 |
|---|------|-----------|
| 1 | 시작 로딩 검정 화면 | 수집품 GLB 약 25개가 preload에 없어 순차 로딩(워터폴)이 생겼음. 전부 preload하고 GLB를 압축(27MB → 16MB, 새 에셋 포함)해서 로컬 기준 약 11초 → 약 3초. 로딩 중에는 진행률 카드 표시 |
| 2 | 레벨업 때 검정 화면과 끊김 | 아이템마다 Suspense를 따로 둬서 장면 전체가 비지 않게 함. `CollectibleGpuWarmup`이 시작할 때 셰이더와 텍스처를 미리 올려 둠 |
| 3 | 기본 속도 | 최고 속도 4.85~5.65 → 5.85~6.8, 합산 상한 7.8 → 9.4 (`rollingMotion.ts`) |
| 4 | 공 투명화 | 공 본체는 시야 페이드에서 제외, 붙은 에셋은 최소 82% 불투명도 유지 |
| 5 | 크루 속도와 방향 | 속도 0.5~0.78 → 1.5~2.2. 시드 기반 무작위 배회(`stepRoamingWander`)로 급반전, 옆으로 꺾기, 짧은 질주 |
| 6 | 2맵 전면 교체 | 달빛 연못과 초승달 제단(징검다리 2줄), 고목 나무집 데크 2채와 밧줄 흔들다리, 발광 버섯 군락(튕김), 돌 아치 3개, 통나무 터널, 탐험가 캠프, 반딧불 랜턴 16개. 1맵의 테라스, 공원, 벤치, 키오스크, 쓰레기통은 제거 |
| 7 | 보물 에셋 | tripo 8종을 레이더 보물 4단계에 두 개씩 배정 (`src/game/treasureModels.ts`) |
| 8 | 구조물 tripo 제작 | 승인받은 7종 생성 후 배치 (`src/assets/game/forest/`) |
| 9 | 물과 잔디 | 물: 파동 노멀, 프레넬 하늘 반사, 해·달빛 반짝임, 얕은 곳 빛 무늬, 물가 거품. 잔디: 휘어지고 끝이 가는 풀잎 11장 묶음, 풀잎별 색 변화, 바람 흔들림 |

주요 파일: `src/game/worldPhysics.ts`(숲 레이아웃), `src/components/game/ForestLandmarks.tsx`, `src/game/forestModelUrls.ts`, `src/components/GameCanvas.tsx`, `src/components/game/NaturalTerrain.tsx`
