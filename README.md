# 배움별 굴리기

[Firebase Hosting에서 바로 플레이하기](https://earsoul-hsy.web.app)

작은 배움 조각부터 차례로 모아 지식별을 키우는 초등학생용 3D 학습
게임입니다. 기존 롤링 수집 장르의 크기 성장 구조를 활용하되, 사람·동물·
무기·파괴 연출 없이 한글, 수학, 과학, 생활 주제를 탐색합니다.

## 주요 기능

- 양쪽 방향 입력을 이용한 3D 롤링 수집 플레이
- 한글 블록, 숫자, 도형, 책, 문구, 식물·행성 모형 등 비폭력 수집물
- 성장 단계마다 열리는 3지선다 학습 문
- 오답 감점 없이 힌트와 재시도 제공
- `/`, `/play`, `/results`로 분리된 SPA 라우팅
- 이름·채팅·공개 순위표 없이 `sessionStorage`에만 유지되는 단일 세션 점수
- Firebase Firestore 학습팩 읽기와 로컬 기본 데이터 폴백
- Firebase Hosting용 SPA rewrite 및 보안 헤더 설정
- 키보드·터치 조이스틱, 문제 읽어 주기, 움직임 줄이기 지원

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
   넣으면 원격 콘텐츠를 사용합니다. 문서가 없거나 연결되지 않으면
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
  title: string
  objects: LearningObject[]
  quizzes: QuizQuestion[]
}
```

Firestore 규칙은 `learningPacks` 컬렉션의 공개 읽기만 허용하고 모든 클라이언트
쓰기를 차단합니다.
