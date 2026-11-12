# تشغيل نموذج حضور CNE (مرة واحدة)

## 1) Google Sheet والسكربت
1. أنشئ Google Sheet جديد (سينزل فيه الحضور).
2. Extensions ← Apps Script، امسح الكود والصق `apps-script/Code.gs`.
3. غيّر `ADMIN_PASSWORD` إلى كلمة مرور قوية.
4. شغّل الدالة `setup` مرة واحدة ووافق على الصلاحيات (تنشئ تبويب Staff).
5. Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone ← Deploy.
6. انسخ رابط الـ Web app (ينتهي بـ /exec) والصقه في `config.js` داخل `API_URL`.

## 2) النشر على GitHub Pages
ارفع كل الملفات (بما فيها مجلد assets) إلى المستودع، ثم Settings ← Pages ← main / root.
- رابط الموظفين: `https://USERNAME.github.io/REPO/`
- لوحة الأدمن: `https://USERNAME.github.io/REPO/admin.html`

## 3) أول استخدام
1. افتح لوحة الأدمن وأنت داخل المستشفى، واضغط **Set hospital location from my current location** (النطاق الافتراضي 300 متر).
2. اكتب Topic وSpeaker والتاريخ ووقت فتح الفورم وإغلاقه.
3. اضغط **Save & open form**. مع كل محاضرة جديدة فعّل خيار "Start a new session" ليُنشأ تبويب جديد في الشيت.

## ملاحظات
- عمود Location Status في الشيت: Inside أو Outside أو Refused (أو Not set إذا لم تحدد موقع المستشفى).
- التسجيلات تُحفظ دائمًا مع حالتها، ويمكنك حذف أي تسجيل من اللوحة.
- منع التكرار حسب الرقم الوظيفي في نفس الجلسة.
- بعد أي تعديل على Code.gs: Deploy ← Manage deployments ← Edit ← New version.
