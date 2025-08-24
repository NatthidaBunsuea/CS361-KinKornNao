Project Proposal: CS361
ข้อมูลทีม
•	ชื่อโปรเจกต์: KinKornNao (กินก่อนเน่า)
•	สมาชิกทีม: 6 คน (ระบุชื่อ-รหัสนักศึกษา-บัญชี GitHub ใน repo จริง)
1.	6609650350 ณัฐธิดา บุญเสือ / Natthida Bunsuea – 6609650350
2.

Problem Statement
ในชีวิตประจำวัน หลายครัวเรือนประสบปัญหาการจัดเก็บและติดตามวัตถุดิบในบ้าน เช่น ลืมว่าวัตถุดิบใดมีอยู่แล้ว ซื้อซ้ำโดยไม่จำเป็น หรือลืมใช้จนหมดอายุ ส่งผลให้เกิดความสิ้นเปลือง ค่าใช้จ่ายที่เพิ่มขึ้น และยังส่งผลต่อการเกิดขยะอาหาร (Food Waste) ซึ่งเป็นปัญหาสำคัญทั้งในระดับครัวเรือนและสังคมโดยรวม
ผู้ใช้และผู้มีส่วนเกี่ยวข้อง (Stakeholders):
•	ผู้ใช้ทั่วไป/เจ้าของบ้าน (Primary Users): ต้องการระบบที่ช่วยจัดการวัตถุดิบในบ้านให้เป็นระเบียบ และลดการสูญเสียจากวัตถุดิบที่หมดอายุ
•	สมาชิกครอบครัว (Household Members): ต้องการสามารถใช้งานระบบร่วมกัน เช่น เพิ่ม/ลบวัตถุดิบ ดูรายการที่มีอยู่ และรับการแจ้งเตือนร่วมกัน
•	ผู้พัฒนาและดูแลระบบ (Developers/Operators): ต้องการสถาปัตยกรรมที่ปลอดภัย มีประสิทธิภาพ และสามารถขยายระบบได้ง่ายในอนาคต

Objectives
-สำหรับผู้ใช้ทั่วไป / เจ้าของบัญชี:
1.	สมัครสมาชิกและเข้าสู่ระบบ (Login/Logout)
2.	จัดการวัตถุดิบ (เพิ่ม, แก้ไข, ลบ)
3.	ดูรายการวัตถุดิบพร้อมรายละเอียด เช่น ปริมาณ, หน่วย, วันหมดอายุ
4.	ระบบแจ้งเตือนอัตโนมัติผ่านอีเมล เมื่อวัตถุดิบใกล้หมดอายุภายใน 3 วัน หรือหมดอายุแล้ว (เวลา 7:00 น. ทุกวัน)
5.	จัดเรียงและค้นหาวัตถุดิบตามเงื่อนไขต่าง ๆ เช่น วันหมดอายุ, ปริมาณ
-สำหรับสมาชิกครอบครัว/ผู้ใช้ร่วม:
1.	เข้าถึงรายการวัตถุดิบที่แชร์ภายในครอบครัว
2.	เพิ่ม/ลบ/แก้ไขวัตถุดิบได้ตามสิทธิ์ที่เจ้าของบัญชีกำหนด
3.	รับอีเมลแจ้งเตือนร่วมกัน หากวัตถุดิบใกล้หมดอายุหรือหมดอายุแล้ว
-สำหรับผู้ดูแลระบบ (Backend/Cloud operators):
1.	ดูแลความปลอดภัยของข้อมูลและสิทธิ์การเข้าถึง
2.	ตรวจสอบและปรับปรุงประสิทธิภาพระบบให้พร้อมใช้งาน
3.	พัฒนา/ขยายระบบได้ง่าย เพื่อรองรับจำนวนผู้ใช้ที่เพิ่มขึ้น
Initial Architecture Diagram (อันเก่า)

Assumptions
•	ผู้ใช้ทุกคนมีอีเมลที่ยืนยัน (verified) สำหรับรับอีเมลแจ้งเตือน
•	ระบบจะโฮสต์ทั้งหมดใน us-east-1 (region เดียว) เพื่อความเรียบง่าย
•	ปริมาณผู้ใช้ในระยะเริ่มต้น < 1,000 ผู้ใช้ และไม่จำเป็นต้องการ multi-region replication ตอนแรก
•	ผู้ใช้ล็อกอินผ่าน Cognito (no social login in v1)
•	Frontend เป็น static SPA โฮสต์บน S3/CloudFront

Constraints
•	งบประมาณจำกัด เลือกบริการ managed เพื่อเลี่ยงต้นทุนการดูแลโครงข่ายมากเกินไป
•	DynamoDB design constraints  ต้องออกแบบ partition key ให้เหมาะสม (userId partition) เพื่อหลีกเลี่ยง hotspot
•	CORS & browser security API ต้องตอบ preflight (OPTIONS) และตั้ง header ให้ถูกต้อง
•	Latency expectation API response < 500ms สำหรับคำขอ CRUD ปกติ
•	Privacy / Data retention เก็บข้อมูลผู้ใช้ตามนโยบาย (ไม่เก็บ sensitive data เกินจำเป็น)
•	Third-party limits SNS/SES rate limits, Cognito token expiry

Well-Architected Analysis
สภาพปัจจุบัน: S3 (Frontend) + API Gateway (HTTP API + JWT Authorizer/Cognito) + Lambda + DynamoDB + SNS (อีเมลแจ้งเตือน 7:00 น.)
1) Operational Excellence
•	 จุดแข็ง: โค้ดแยกเป็นฟังก์ชัน, CloudWatch Logs ใช้ได้, ดีพลอยง่าย
•	จุดอ่อน: ยังไม่มี Runbook/Playbook เหตุขัดข้อง, ไม่มี CI/CD ครบวงจร, Logging ยังไม่เป็น structured/trace id
•	ปรับปรุง: GitHub Actions (lint/test/deploy dev→prod), Structured log + Correlation ID, Health check/Status page, Runbook
2) Security
•	จุดแข็ง: ใช้ Cognito + JWT, API Gateway Authorizer, S3 Static hosting
•	จุดอ่อน: IAM อาจกว้างเกิน (ไม่ least privilege), การจัดการ secret/param ยังไม่ชัด, CORS/config ผิดพลาดทำให้เกิด 401 ได้
•	ปรับปรุง: IAM least-privilege ให้ Lambda/DynamoDB/SNS, ใช้ SSM Parameter Store, คุม CORS ให้จำเพาะ origin, เพิ่ม Token refresh/expiry handling ฝั่งหน้าเว็บ
3) Reliability
•	จุดแข็ง: Serverless ลด single point, Multi-AZ โดยบริการ AWS
•	จุดอ่อน: ไม่มี DLQ/Retry สำหรับงานแจ้งเตือน, ไม่มี Idempotency ในเขียนซ้ำ, ไม่มี Alarm ตาม SLA
•	ปรับปรุง: ตั้ง DLQ + Retry (Lambda/SNS), Idempotency key (เช่น itemId+date), CloudWatch Alarms (5xx, latency, throttling), Backup/Export ข้อมูลสำคัญ
4) Performance Efficiency
•	จุดแข็ง: DynamoDB latency ต่ำ, Lambda scale อัตโนมัติ
•	จุดอ่อน: สคีมา/Index อาจยังไม่เหมาะกับหลายมิติ (เช่น household), ไม่มีแคช, Cold start ยังไม่ถูกจูน
•	ปรับปรุง: ออกแบบ PK/SK + GSI สำหรับ use case ใหม่, Query/Projection เฉพาะ field ที่ใช้, เปิดแคชชั้นอ่าน (เช่น short-lived cache), จูนขนาดเมม Lambda/Node เวอร์ชัน
5) Cost Optimization
•	จุดแข็ง: จ่ายตามใช้, ไม่มีเซิร์ฟเวอร์ค้าง
•	จุดอ่อน: ยังไม่มี Budget/Alert, Provisioned/RCU/WCU ไม่ถูกจูน, งาน Batch/Scan เสี่ยงค่าบาน
•	ปรับปรุง: AWS Budgets + Alarm, ใช้ On-demand อย่างเหมาะสม/จูน RCU-WCU, หลีกเลี่ยง Scan, Batch write/read
6) Sustainability
•	จุดแข็ง: Serverless ใช้ทรัพยากรเท่าที่จำเป็น
•	จุดอ่อน: ไม่มีการมอนิเตอร์งานที่ซ้ำซ้อน/ลูปผิดพลาด, ไม่มีนโยบาย Lifecycle (เช่น ล็อก/ไฟล์/ข้อมูลชั่วคราว)
•	ปรับปรุง: ล้างข้อมูลชั่วคราวด้วย TTL, ปิดทรัพยากร dev ที่ไม่ใช้, รวม log/metrics อย่างมี retention policy

Development / Improvement Plan
Checkpoint #1 (สัปดาห์ที่ 5–6)
ช่วงเวลา: หลังส่ง proposal ก่อนสัปดาห์ 6
•	Frontend
o	สร้างโครงร่างหน้าเว็บเบื้องต้น (Login, Dashboard แสดงรายการวัตถุดิบ)
o	เชื่อมต่อ API Gateway แบบ mock / Lambda stub เพื่อลอง flow
•	Backend
o	ออกแบบ DynamoDB schema (userId, itemId, expiryDate)
o	พัฒนา Lambda สำหรับ CRUD (เพิ่ม/ลบ/แก้ไข/ดึงรายการวัตถุดิบ)
•	Cloud / Infra
o	ตั้งค่า Cognito User Pool (สมัครสมาชิก/ล็อกอิน)
o	สร้าง API Gateway (HTTP API) + integrate Lambda
o	ตั้งค่า S3 hosting สำหรับ frontend (Dev environment)
•	เป้าหมาย: ให้ระบบสามารถ Login และจัดการข้อมูลใน DynamoDB ผ่าน API ได้ → มี ฟังก์ชันหลักอย่างน้อย 30%
Checkpoint #2 (สัปดาห์ที่ 10–11)
ช่วงเวลา: หลังส่งงาน #1ก่อนสัปดาห์ 11
•	Frontend
o	เพิ่ม UI ดูรายละเอียดสินค้า + วันหมดอายุ
o	เพิ่มการแสดงผลแจ้งเตือน (warning: ใกล้หมดอายุ / expired)
•	Backend
o	Lambda Schedule ผ่าน EventBridge ตรวจสอบสินค้าใกล้หมดอายุใน 3 วัน และ expired
o	ส่งแจ้งเตือนผ่าน SNS/SES ไปยัง email ผู้ใช้
•	Cloud / Infra
o	เพิ่ม CI/CD (GitHub Actions S3 + Lambda deploy)
o	Monitor ผ่าน CloudWatch (log, metrics, alarms)
•	เป้าหมาย: ระบบแจ้งเตือนเริ่มทำงานจริง, รองรับผู้ใช้หลายคน, ฟังก์ชันครบอย่างน้อย 70%
Final (สัปดาห์ที่ 15)
ช่วงเวลา: หลังส่งงาน #2 สัปดาห์ 15
•	Frontend
o	เพิ่มหน้าโปรไฟล์ผู้ใช้ (แก้ไขข้อมูลติดต่อ, email, password reset)
o	UI สมบูรณ์และ responsive
•	Backend
o	ปรับปรุง query (เช่น index DynamoDB) ให้ทำงานเร็วขึ้น
o	เพิ่มฟังก์ชัน optional เช่น “แนะนำเมนูจากวัตถุดิบที่มี” หรือ “แชร์รายการกับเพื่อนในบ้าน”
•	Cloud / Infra
o	Optimize security (CORS allow เฉพาะ domain จริง, SES ออกจาก sandbox)
o	Load testing + tuning DynamoDB/Lambda timeout
•	เป้าหมาย: Demo ระบบครบ 100% ตาม objectives + วิเคราะห์ตาม Well-Architected Framework

Success Criteria
1.	Functional Success
o	ผู้ใช้ ล็อกอิน/ล็อกเอาท์ ได้ token ถูกต้อง, session ทำงาน
o	สามารถ เพิ่ม/ลบ/แก้ไข วัตถุดิบ ข้อมูลเก็บใน DynamoDB อย่างถูกต้อง
o	ดูรายการวัตถุดิบ พร้อมวันหมดอายุ แสดงผลตรงกับ DB
o	ระบบ ส่งอีเมลแจ้งเตือน วัตถุดิบใกล้หมดอายุ/หมดอายุทุกเช้า 07:00 น.
2.	Technical Success
o	ระบบมี Uptime ≥ 99% (ตาม CloudWatch logs)
o	Response time ของ API (CRUD) ≤ 500ms เฉลี่ย
o	DynamoDB query latency ≤ 50ms ต่อ request
3.	Team/Process Success
o	สมาชิกทุกคนมี contribution ใน GitHub (commits, issues, PR)
o	ใช้ Wiki อัปเดต progress ชัดเจนในแต่ละ Checkpoint
o	ระบบพัฒนาเสร็จ ≥ 90% ของ objectives ที่ตั้งไว้ใน proposal
4.	Well-Architected Alignment
o	Security: Authentication ผ่าน Cognito + IAM roles จำกัดสิทธิ
o	Reliability: Lambda stateless, ใช้ retry mechanism, error logs
o	Performance Efficiency: DynamoDB with proper keys, On-demand scaling
o	Operational Excellence: Monitoring ผ่าน CloudWatch + CI/CD pipeline
o	Cost Optimization: ใช้ serverless (จ่ายตามใช้จริง ไม่ต้องมี EC2 ตลอดเวลา)

