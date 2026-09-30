import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 공공데이터포털 특일 정보 API 에서 공휴일을 받아 src/data/holidays.json 을 갱신한다.
// 커밋된 파일을 항상 기준으로 삼고, API 가 실패했거나 기존보다 적게 준 연도는 기존 데이터를 유지한다.
// 키가 없거나 모든 연도가 실패하면 exit 1 로 알리되, 파일은 건드리지 않으므로
// CI 에서는 continue-on-error 로 커밋된 데이터로 배포를 계속한다.

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

  const 날짜별 = new Map();
  for (const 항목 of 배열) {
    if (항목.isHoliday !== "Y") continue;
    const locdate = String(항목.locdate);
    const 날짜 = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
    // 같은 날짜에 공휴일이 겹치면(예: 어린이날·부처님오신날) 이름을 합쳐 한 항목으로
    const 기존 = 날짜별.get(날짜);
    if (!기존) 날짜별.set(날짜, { 날짜, 이름: 항목.dateName });
    else if (!기존.이름.split(" · ").includes(항목.dateName)) 기존.이름 += ` · ${항목.dateName}`;
  }
  return [...날짜별.values()].sort((a, b) => a.날짜.localeCompare(b.날짜));
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
    console.error("환경변수 DATA_GO_KR_KEY 가 없어 공휴일을 갱신하지 못했습니다. 기존 데이터는 그대로입니다.");
    console.error("로컬: .env.local 또는 export DATA_GO_KR_KEY=... / CI: GitHub Secrets 에 등록");
    process.exitCode = 1;
    return;
  }

  const 현재연도 = new Date().getFullYear();
  const 연도범위 = [현재연도 - 1, 현재연도, 현재연도 + 1, 현재연도 + 2];

  // 연도별 조회는 서로 독립이므로 동시에 보낸다
  const 응답들 = await Promise.allSettled(연도범위.map(공휴일가져오기));

  let 변경 = false;
  let 실패수 = 0;
  연도범위.forEach((연도, i) => {
    const 응답 = 응답들[i];
    if (응답.status === "rejected") {
      실패수++;
      console.warn(`✗ ${연도}년 갱신 실패, 기존 데이터 유지: ${응답.reason?.message ?? 응답.reason}`);
      return;
    }
    const 데이터 = 응답.value;
    const 기존 = 결과[연도] ?? [];
    // 공휴일은 늘어나기만 하므로(임시·대체공휴일) 기존보다 적은 응답은 불완전한 것으로 보고 버린다
    if (데이터.length < 기존.length) {
      console.warn(`△ ${연도}년: API 응답(${데이터.length}일)이 기존(${기존.length}일)보다 적어 기존을 유지합니다`);
      return;
    }
    if (JSON.stringify(데이터) !== JSON.stringify(기존)) 변경 = true;
    결과[연도] = 데이터;
    console.log(`✓ ${연도}년: ${데이터.length}일`);
  });

  if (실패수 === 연도범위.length) {
    console.error("\n모든 연도 조회에 실패했습니다. 기존 데이터는 그대로입니다.");
    process.exitCode = 1;
    return;
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
  console.error(`공휴일 갱신 중 오류, 기존 데이터 유지: ${오류.message}`);
  process.exitCode = 1;
});
