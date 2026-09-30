import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 공공데이터포털 특일 정보 API 에서 공휴일을 받아 src/data/holidays.json 을 갱신한다.
// 커밋된 파일을 항상 기준으로 삼고, API 가 비었거나 실패한 연도는 기존 데이터를 유지한다.
// 따라서 이 스크립트는 배포를 막지 않는다 (실패해도 exit 0).

const 현재파일경로 = fileURLToPath(import.meta.url);
const 프로젝트루트 = resolve(dirname(현재파일경로), "..");
const 출력경로 = resolve(프로젝트루트, "src/data/holidays.json");

const 엔드포인트 =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

const 서비스키 = process.env.DATA_GO_KR_KEY;

async function 공휴일가져오기(연도) {
  const 쿼리 = new URLSearchParams({
    serviceKey: 서비스키,
    solYear: String(연도),
    numOfRows: "100",
    _type: "json",
  });
  const 응답 = await fetch(`${엔드포인트}?${쿼리}`);
  if (!응답.ok) {
    throw new Error(`HTTP ${응답.status} (${연도}년)`);
  }
  const 본문 = await 응답.json();

  const 결과코드 = 본문?.response?.header?.resultCode;
  if (결과코드 && 결과코드 !== "00") {
    const 메시지 = 본문?.response?.header?.resultMsg ?? "알 수 없는 오류";
    throw new Error(`API 오류 ${결과코드}: ${메시지} (${연도}년)`);
  }

  const 항목들 = 본문?.response?.body?.items?.item;
  if (!항목들) return [];
  const 배열 = Array.isArray(항목들) ? 항목들 : [항목들];

  return 배열
    .filter((항목) => 항목.isHoliday === "Y")
    .map((항목) => {
      const locdate = String(항목.locdate);
      const 날짜 = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
      return { 날짜, 이름: 항목.dateName };
    })
    .sort((a, b) => a.날짜.localeCompare(b.날짜));
}

async function 기존데이터() {
  try {
    return JSON.parse(await readFile(출력경로, "utf-8"));
  } catch {
    return {};
  }
}

async function 메인() {
  const 결과 = await 기존데이터();

  if (!서비스키) {
    console.warn("환경변수 DATA_GO_KR_KEY 가 없어 공휴일 갱신을 건너뜁니다. 기존 데이터를 그대로 씁니다.");
    console.warn("로컬: .env.local 또는 export DATA_GO_KR_KEY=... / CI: GitHub Secrets 에 등록");
    return;
  }

  const 현재연도 = new Date().getFullYear();
  const 연도범위 = [현재연도 - 1, 현재연도, 현재연도 + 1, 현재연도 + 2];

  let 변경 = false;
  for (const 연도 of 연도범위) {
    try {
      const 데이터 = await 공휴일가져오기(연도);
      const 기존 = 결과[연도] ?? [];
      if (데이터.length === 0 && 기존.length > 0) {
        console.warn(`△ ${연도}년: API 응답이 비어 있어 기존 ${기존.length}일을 유지합니다`);
        continue;
      }
      if (JSON.stringify(데이터) !== JSON.stringify(기존)) 변경 = true;
      결과[연도] = 데이터;
      console.log(`✓ ${연도}년: ${데이터.length}일`);
    } catch (오류) {
      console.warn(`✗ ${연도}년 갱신 실패, 기존 데이터 유지: ${오류.message}`);
    }
  }

  if (!변경) {
    console.log("\n변경 없음");
    return;
  }
  await mkdir(dirname(출력경로), { recursive: true });
  await writeFile(출력경로, JSON.stringify(결과, null, 2) + "\n", "utf-8");
  console.log(`\n저장: ${출력경로}`);
}

메인().catch((오류) => {
  // 예기치 못한 오류도 배포를 막지 않는다. 기존 데이터로 빌드한다.
  console.warn(`공휴일 갱신 중 오류, 기존 데이터 유지: ${오류.message}`);
});
