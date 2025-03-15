/**
 * 객체 구조 조작을 위한 유틸리티 함수
 */

/**
 * 중첩된 객체를 평탄화하여 키를 점으로 구분된 문자열로 변환
 * @param obj 중첩된 객체
 * @param prefix 키 접두사 (내부 재귀 호출용)
 * @returns 평탄화된 객체
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix = ""
): Record<string, string> {
  return Object.keys(obj).reduce((acc: Record<string, string>, key: string) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      // 중첩된 객체일 경우 재귀 호출
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else if (typeof obj[key] === "string") {
      // 문자열 값인 경우만 추가
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

/**
 * 평탄화된 객체를 중첩 구조로 변환
 * @param obj 평탄화된 객체 (키가 점으로 구분됨)
 * @returns 중첩된 객체
 */
export function unflattenObject(
  obj: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    // 키를 점으로 분리
    const parts = key.split(".");
    let current = result;

    // 마지막 키 전까지 객체 구조 생성
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // 마지막 키에 값 할당
    const lastPart = parts[parts.length - 1];
    current[lastPart] = obj[key];
  });

  return result;
}

/**
 * 객체가 중첩 구조인지 확인
 * @param obj 확인할 객체
 * @returns 중첩 구조 여부
 */
export function hasNestedStructure(obj: Record<string, any>): boolean {
  return Object.values(obj).some(
    (value) =>
      typeof value === "object" && value !== null && !Array.isArray(value)
  );
}
