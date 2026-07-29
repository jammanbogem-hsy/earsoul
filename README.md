# 러닝크루 롤링

[Firebase Hosting에서 바로 플레이하기](https://earsoul-hsy.web.app)

운동화 끈부터 보물함까지 차례로 모아 러닝볼을 키우는 초등학생용 3D
수집 게임입니다. 롤링 수집 장르의 크기 성장 구조를 활용하되 무기·파괴
연출 없이 러닝 기어, 음료, 기록 아이템과 보물을 수집합니다.

## 주요 기능

- 카메라 진행 방향 기준의 상대 WASD·방향키·터치 조이스틱 조작
- 영문과 한글 자판의 `WASD`·`ㅈㅁㄴㅇ` 동시 지원
- 운동화, 음료수 캔, 시계, 메달, 보석, 보물함 등 비폭력 수집물
- 자체 제작 저폴리 어린이 캐릭터가 러닝볼을 미는 동작
- 회전 색띠, 바닥 먼지와 걸음 애니메이션으로 보이는 굴림 효과
- 숫자·이름·바닥 원 개수로 구분되는 네 단계 수집물 크기
- 58×58 단위 러닝 파크와 네 단계 크기 진행
- 4.5초 연속 수집, 최대 5배 점수와 최고 콤보 기록
- `/`, `/play`, `/results`로 분리된 SPA 라우팅
- 이름·채팅·공개 순위표 없이 `sessionStorage`에만 유지되는 단일 세션 점수
- Firebase Firestore 버전형 콘텐츠 읽기와 로컬 기본 데이터 폴백
- Firebase Hosting용 SPA rewrite 및 보안 헤더 설정
- 키보드·터치 조이스틱과 움직임 줄이기 지원

## 로컬 실행

```bash
npm install
npm run dev
```

검증:

```bash
npm run lint
npm test
npm run build
```

## Firebase 설정

1. `.env.example`을 `.env.local`로 복사합니다.
2. Firebase 웹 앱의 공개 설정 값을 입력합니다.
3. Firestore의 `learningPacks/default` 문서에 `LearningPack` 형태의 콘텐츠를
   넣으면 원격 콘텐츠를 사용합니다. 현재 팩과 동일한 `version: 2`가
   필요합니다. 문서가 없거나 버전이 다르거나 연결되지 않으면
   `src/data/learningPack.ts`의 안전한 기본 콘텐츠를 사용합니다.
4. 배포합니다.

```bash
npm run firebase:deploy
```

학생 점수와 수집 기록은 Firestore에 전송하지 않습니다. 현재 브라우저 탭의
세션에만 저장되며 세션 종료 후 남지 않습니다.

## 콘텐츠 구조

```ts
interface LearningPack {
  version?: number
  title: string
  objects: LearningObject[]
}
```

Firestore 규칙은 `learningPacks` 컬렉션의 공개 읽기만 허용하고 모든 클라이언트
쓰기를 차단합니다.
