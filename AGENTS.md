# AGENTS Session Summary

## Goal
نظام متكامل لإدارة شؤون الموظفين: رواتب، بصمة (حضور/انصراف)، سلفيات (قصيرة/طويلة) مع رفع ملفات، وإجازات بأنواعها مع رفع ملفات وعرض الحالة بالعربية

## Constraints & Preferences
- السلفة القصيرة: الحد المسموح فقط نسبة من إجمالي المرتب (%)، بدون حد أقصى بالجنيه وبدون نسبة خصم
- السلفة الطويلة: حد أقصى بالجنيه فقط، بدون نسبة من المرتب
- طلب السلفية: إلزامي إرفاق ملف (jpg/png/pdf) — يظهر في طلبات السلفيات وفي تقرير الموظف
- جهاز K40 الحالي لا يدعم enrollment عن بعد (سيتم استبداله)
- قاعدة البيانات MySQL (MariaDB)، المكتبة المستخدمة `jmrashed/zkteco` فقط
- أنواع الإجازات: رسمية، مرضية، أمومة، حج، بدون مرتب — كل نوع يتقيد بالمدة القصوى
- رفع ملف (صورة/PDF) في طلب الإجازة
- عرض نوع الإجازة بالعربية في طلبات الإجازات وتقرير الموظف
- إظهار نوع الإجازة + المتبقي بالأيام في حالة الموظف، والعودة التلقائية إلى "نشط" بعد انتهاء الإجازة

## Progress

### Done
- **إصلاح مزامنة الحضور**: إزالة `ON UPDATE CURRENT_TIMESTAMP` من عمود `timestamp` في `attendance_device_logs` لتجنب تعارض `upsert`
- إضافة deduplication داخل الدفعة لمنع تكرار نفس المفتاح الفريد `(device_user_id, timestamp, state)`
- إصلاح `Cannot redeclare` error من دوال مكررة بسبب git merge conflict
- إزالة علامات conflict من `AttendanceDeviceController.php`
- إصلاح import من `Rats\Zkteco` إلى `Jmrashed\Zkteco`
- إضافة عمود `type` إلى جدول `fingerprints`
- تحويل بيانات البصمات الثنائية إلى base64 في `downloadFingerprints()`
- **إعدادات السلفيات**: تحديث `SettingsController` — إزالة `max_amount` و `deduction_percent` من short_advance؛ إزالة `max_percent` من long_advance
- **رفع ملف السلفية**: إضافة عمود `attachment` + رفع ملف في `AdvancesController` + عرض في `RequestsPage.tsx` و `ReportsPage.tsx`
- **نظام الإجازات**: تحديث `LeavesController` — أنواع (official, sick, maternity, hajj, unpaid) مع التحقق من المدة القصوى حسب الإعدادات + رفع ملف `attachment`
- تحديث `SettingsController`: إضافة `hajj_days` (14) و `unpaid_leave_max_days` (30) إلى defaults
- تحديث `Leave.php` model: إضافة `attachment` إلى `$fillable`
- تحديث `ReportsController`: إضافة `attachment_url` في استجابة leaves لتقرير الموظف
- تحديث `Employee.tsx`: 5 أنواع إجازات + رفع ملف مع معاينة + استبدال البار العلوي بـ `<Topbar>` + إظهار "في إجازة [النوع]" مع المتبقي بالأيام + إصلاح صورة الموظف (استخدام `getStorageUrl`)
- إنشاء `/default-avatar.svg` في frontend/public
- تحديث `Topbar.tsx`: تغيير fallback الصورة
- تحديث `RequestsPage.tsx`: إضافة عمود "المرفق" + عرض النوع بالعربية
- تحديث `ReportsPage.tsx`: إضافة عمود "المرفق" + النوع بالعربية في سجل الإجازات
- تحديث `api.ts` (types): إضافة `attachment` و `attachment_url` إلى `LeaveRequest` interface
- **إصلاح `active_leave` bug**: مقارنة `$leave->from_date` (Carbon) مع `$today` (string) باستخدام `->format('Y-m-d')` بدلاً من المقارنة المباشرة التي كانت تفشل بسبب تحويل Carbon إلى string يتضمن الوقت
- **إصلاح `remaining_days`**: استخدام `DateTime::diff->days` بدلاً من `Carbon::diffInDays` التي كانت تعيد قيمة سالبة (signed) في Carbon 3.x
- **زر إدارة العهد**: تغيير زر "↩️ إرجاع عهد" إلى "📦 إدارة العهد" مع مودال بثلاث تبويبات (إضافة عهدة، إرجاع عهدة، تعديل عهدة) — يستخدم API `POST /employee-assets` للإضافة و `PUT /employee-assets/{id}` للتعديل و `POST /employee-assets/{id}/return` للإرجاع
- **زر تجديد عقد**: تغيير زر "إنشاء عقد" إلى "تجديد عقد" مع تحديث عنوان المودال ديناميكياً حسب وجود عقد سابق
- **نظام تقييم الموظفين بالنجوم**: إعادة تصميم واجهة التقييم — 3 فئات (المظهر العام، السلوك الشخصي، أداء الموظف) كل فئة 10 نجوم مع تأثير ذهبي متوهج عند الاختيار
- **واجهة نجوم تفاعلية**: مكون `StarRating.tsx` — نجوم SVG مطفية افتراضياً، عند الضغط عليها تشع بالذهب مع تأثير glow
- **API تقييم جديد**: route `POST /employees/{id}/evaluate` يحفظ التقييم في جدول `employee_evaluations` (ظهر، سلوك، أداء، مجموع كلي، ملاحظات)
- **جدول تقييمات**: `employee_evaluations` مع العلاقة مع الموظف والمقيم
- **تقرير التقييمات**: تحديث `employeeEvaluationReport` ليشمل التقييمات اليدوية (manual_evaluation) مع تحديد الموظف المثالي تلقائياً
- **صفحة التقارير**: إضافة قسم الموظف المثالي مع عرض نجومه الذهبية + عمود نجوم التقييم في الجدول العام
- **تقييم بالفترة الشهرية**: إضافة عمود `period` (Y-m) لجدول التقييمات — كل شهر لكل موظف تقييم مستقل، مع اختيار الشهر في واجهة التقييم والتقارير لتحديد الموظف المثالي لكل شهر

### In Progress
- (none)

### Blocked
- فشل تشغيل `php artisan migrate` بسبب خطأ في جدول `roles` (موجود مسبقاً) — بعض التغييرات نفذت يدوياً

## Key Decisions
- استخدام `Jmrashed\Zkteco` بدلاً من `Rats\Zkteco`
- إزالة `exists()` check في sync والاكتفاء بـ `upsert()` + deduplication داخل الدفعة
- تحويل بيانات البصمات لـ base64
- تخزين ملفات السلفيات في `storage/app/public/advance-attachments/` والإجازات في `storage/app/public/leave-attachments/`
- `active_leave` تعتمد فقط على `to_date >= today && from_date <= today` — عندما تنتهي الإجازة يعود null وتظهر الحالة "نشط" تلقائياً
- صورة الموظف: استخدام `getStorageUrl(employee.profile_photo)` بدلاً من `employee.profile_photo_url` لأن `APP_URL=http://localhost`
- في Carbon 3.x، `diffInDays` ترجع signed value (تستخدم `%r%a`), لذا نستخدم `DateTime::diff->days` لحساب `remaining_days`

## Next Steps
- اختبار رفع الملف لطلب الإجازة (API + UI)
- اختبار رفع الملف لطلب السلفية (API + UI)
- اختبار المزامنة بعد الإصلاحات كاملة
- عند استبدال جهاز K40 بجهاز يدعم enrollment عن بعد، تفعيل `startEnroll()` تلقائياً

## Critical Context
- `ZKTecoService::startEnroll()` يستخدم `_command()` لإرسال الأمر `CMD_START_ENROLL = 97` — لا يعمل على K40
- المكتبة `jmrashed/zkteco` لا تحتوي على دالة `startFingerprintEnroll` عالية المستوى
- باقي أخطاء في الـ log: `Column not found: 1054 Unknown column 'employee_id'` في جدول `attendance_device_logs` (قديم) + `Table 'hrm.resignation_requests' doesn't exist` (قديم)
- `APP_URL=http://localhost` في `.env` لكن الخادم الفعلي `http://server/hr-app/public` — يسبب مشاكل في `Storage::url()`

## Relevant Files
- `app/Http/Controllers/AttendanceDeviceController.php`
- `app/Http/Controllers/AdvancesController.php`
- `app/Http/Controllers/LeavesController.php`
- `app/Http/Controllers/SettingsController.php`
- `app/Http/Controllers/ReportsController.php`
- `app/Http/Controllers/EmployeesController.php` (line ~389: active_leave detection + remaining_days)
- `app/Services/ZKTecoService.php`
- `app/Models/Leave.php`
- `app/Models/AdvanceRequest.php`
- `frontend/src/pages/Employee.tsx`
- `frontend/src/pages/RequestsPage.tsx`
- `frontend/src/pages/ReportsPage.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/components/Topbar.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/types/api.ts`
- `frontend/public/default-avatar.svg`
- `routes/api.php`
