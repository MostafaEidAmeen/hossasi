# دليل نشر تطبيق حصصي

تم تجهيز المشروع ليكون تطبيق Expo/React Native قابلًا للبناء عبر EAS. أُصلحت إعدادات التخطيط العام، أُخفي عنوان Stack الافتراضي الذي كان يظهر باسم `(tabs)`، وأصبحت الحاويات تمتد بعرض الشاشة مع دعم أفضل لمحاذاة RTL. كما أُضيفت بطاقة أداء أسبوعية تفاعلية إلى الشاشة الرئيسية.

## التحقق المحلي

```bash
pnpm install
pnpm check
npx expo-doctor
```

يجب أن يظهر فحص TypeScript بدون أخطاء، وأن ينجح expo-doctor في 18/18 فحصًا.

## بناء APK للتثبيت المباشر

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

ملف `preview` ينتج APK يمكن تنزيله وتثبيته مباشرة على جهاز Android.

## بناء نسخة Google Play

```bash
npx eas-cli@latest build --platform android --profile production
```

ينتج هذا الإعداد Android App Bundle بصيغة AAB، وهي الصيغة المناسبة للرفع إلى Google Play Console.

## بناء iOS ورفعه إلى TestFlight

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```

بناء iOS يتطلب حساب Apple Developer وبيانات App Store Connect عند الرفع. بعد معالجة Apple للنسخة، يمكن توزيعها من خلال TestFlight.

## بناء المنصتين

```bash
npx eas-cli@latest build --platform all --profile production
```

## رابط مشروع EAS

https://expo.dev/accounts/mostafaeidameen/projects/hossasi

## ملاحظات

الإشعارات الموجودة حاليًا محلية: تذكير قبل الحصة بساعة وقبل نصف ساعة. الإشعارات الفورية عن بُعد تحتاج خادمًا لتسجيل Expo Push Token وإرسال الرسائل، ولا ينبغي إضافة مفاتيح خادم إلى التطبيق نفسه.
