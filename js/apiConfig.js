/**
 * KinKonNao™ — การตั้งค่า API
 * บทบาท:
 *  - กำหนดโหมดทำงานของ data layer:
 *      - 'mock' : ใช้ localStorage
 *      - 'api'  : ยิง REST API (ใช้ apiBaseUrl)
 *  - ระบุ region และ householdId เริ่มต้นของผู้ใช้
 *
 * ค่าพื้นฐาน:
 *  - mode: 'mock'
 *  - apiBaseUrl: URL ของ API Gateway (ปรับตาม environment)
 *  - householdId: ใช้คู่กับหน้าโปรไฟล์/แชร์ครัวเรือน
 */

// Toggle between 'mock' and 'api'
const ApiConfig = {
    mode: 'mock', // 'mock' | 'api'
    apiBaseUrl: 'https://your-api.execute-api.ap-southeast-1.amazonaws.com/prod',
    region: 'ap-southeast-1',
    householdId: 'H-1001'
  };