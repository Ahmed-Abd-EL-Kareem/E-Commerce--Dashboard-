# E-Commerce Admin Dashboard | لوحة تحكم التجارة الإلكترونية

[English](#english) | [العربية](#arabic)

---

## English

### 📋 Overview

A modern, responsive e-commerce admin dashboard built with React and Vite. This application provides comprehensive management tools for products, categories, orders, customers, and cart operations with full bilingual support (English/Arabic).

### ✨ Features

- **🛒 Product Management**: Create, edit, and manage products with variants and detailed specifications
- **📂 Category Management**: Hierarchical category system with subcategories and sub-subcategories
- **📦 Order Management**: Track and manage customer orders with status updates
- **👥 Customer Management**: View and manage customer information and interactions
- **🛍️ Cart Management**: Admin view of customer carts with discount management
- **🌐 Internationalization**: Full bilingual support (English/Arabic) with RTL layout
- **🔐 Authentication**: Secure login system with protected routes
- **📊 Dashboard Analytics**: Overview of key business metrics
- **🎨 Modern UI**: Clean, responsive design with Tailwind CSS and DaisyUI
- **📱 Mobile Responsive**: Optimized for all device sizes

### 🛠️ Tech Stack

- **Frontend Framework**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.7 + DaisyUI 5.0.38
- **State Management**: TanStack React Query 5.77.2
- **Routing**: React Router DOM 7.6.1
- **Forms**: React Hook Form 7.57.0 + Yup/Zod validation
- **HTTP Client**: Axios 1.9.0
- **Internationalization**: React i18next 15.5.3
- **Icons**: Lucide React 0.511.0 + React Icons 5.5.0
- **Notifications**: React Hot Toast 2.5.2
- **Charts**: Recharts 2.15.3
- **PDF Generation**: jsPDF 2.5.1

### 🚀 Quick Start

#### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Application pages
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard overview
│   ├── products/      # Product management
│   ├── categories/    # Category management
│   ├── orders/        # Order management
│   ├── customers/     # Customer management
│   ├── cart/          # Cart management
│   └── brands/        # Brand management
├── contexts/          # React contexts (Auth, etc.)
├── hooks/            # Custom React hooks
├── i18n/             # Internationalization setup
│   └── locales/      # Translation files
├── layouts/          # Layout components
├── routes/           # Routing configuration
├── constants/        # Configuration constants
└── modules/          # Business logic modules
```

### 🌐 Deployment

This project is configured for deployment on Vercel with the included `vercel.json` configuration.

#### Deploy to Vercel

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Deploy automatically on every push

### 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=your_api_url
```

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Arabic

### 📋 نظرة عامة

لوحة تحكم إدارية حديثة ومتجاوبة للتجارة الإلكترونية مبنية باستخدام React و Vite. يوفر هذا التطبيق أدوات إدارة شاملة للمنتجات والفئات والطلبات والعملاء وعمليات السلة مع دعم كامل للغتين (الإنجليزية/العربية).

### ✨ المميزات

- **🛒 إدارة المنتجات**: إنشاء وتعديل وإدارة المنتجات مع المتغيرات والمواصفات التفصيلية
- **📂 إدارة الفئات**: نظام فئات هرمي مع فئات فرعية وفئات فرعية ثانوية
- **📦 إدارة الطلبات**: تتبع وإدارة طلبات العملاء مع تحديثات الحالة
- **👥 إدارة العملاء**: عرض وإدارة معلومات العملاء والتفاعلات
- **🛍️ إدارة السلة**: عرض إداري لسلات العملاء مع إدارة الخصومات
- **🌐 التدويل**: دعم كامل للغتين (الإنجليزية/العربية) مع تخطيط RTL
- **🔐 المصادقة**: نظام تسجيل دخول آمن مع مسارات محمية
- **📊 تحليلات لوحة التحكم**: نظرة عامة على المقاييس التجارية الرئيسية
- **🎨 واجهة مستخدم حديثة**: تصميم نظيف ومتجاوب مع Tailwind CSS و DaisyUI
- **📱 متجاوب مع الهاتف المحمول**: محسن لجميع أحجام الأجهزة

### 🛠️ المكدس التقني

- **إطار العمل الأمامي**: React 19.1.0
- **أداة البناء**: Vite 6.3.5
- **التصميم**: Tailwind CSS 4.1.7 + DaisyUI 5.0.38
- **إدارة الحالة**: TanStack React Query 5.77.2
- **التوجيه**: React Router DOM 7.6.1
- **النماذج**: React Hook Form 7.57.0 + التحقق من Yup/Zod
- **عميل HTTP**: Axios 1.9.0
- **التدويل**: React i18next 15.5.3
- **الأيقونات**: Lucide React 0.511.0 + React Icons 5.5.0
- **الإشعارات**: React Hot Toast 2.5.2
- **الرسوم البيانية**: Recharts 2.15.3
- **إنتاج PDF**: jsPDF 2.5.1

### 🚀 البداية السريعة

#### المتطلبات المسبقة

- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn

#### التثبيت

```bash
# استنساخ المستودع
git clone <repository-url>
cd frontend

# تثبيت التبعيات
npm install

# بدء خادم التطوير
npm run dev

# البناء للإنتاج
npm run build

# معاينة بناء الإنتاج
npm run preview
```

### 📁 هيكل المشروع

```
src/
├── components/          # مكونات واجهة المستخدم القابلة لإعادة الاستخدام
├── pages/              # صفحات التطبيق
│   ├── auth/          # صفحات المصادقة
│   ├── dashboard/     # نظرة عامة على لوحة التحكم
│   ├── products/      # إدارة المنتجات
│   ├── categories/    # إدارة الفئات
│   ├── orders/        # إدارة الطلبات
│   ├── customers/     # إدارة العملاء
│   ├── cart/          # إدارة السلة
│   └── brands/        # إدارة العلامات التجارية
├── contexts/          # سياقات React (المصادقة، إلخ)
├── hooks/            # خطافات React المخصصة
├── i18n/             # إعداد التدويل
│   └── locales/      # ملفات الترجمة
├── layouts/          # مكونات التخطيط
├── routes/           # تكوين التوجيه
├── constants/        # ثوابت التكوين
└── modules/          # وحدات منطق الأعمال
```

### 🌐 النشر

تم تكوين هذا المشروع للنشر على Vercel مع تكوين `vercel.json` المدرج.

#### النشر على Vercel

1. ادفع الكود إلى مستودع Git
2. اربط المستودع بـ Vercel
3. النشر التلقائي مع كل دفعة

### 📝 النصوص المتاحة

- `npm run dev` - بدء خادم التطوير
- `npm run build` - البناء للإنتاج
- `npm run preview` - معاينة بناء الإنتاج
- `npm run lint` - تشغيل ESLint

### 🔧 متغيرات البيئة

أنشئ ملف `.env` في الدليل الجذر:

```env
VITE_API_BASE_URL=your_api_url
```

### 🤝 المساهمة

1. فرّع المستودع
2. أنشئ فرع ميزة
3. قم بإجراء التغييرات
4. أرسل طلب سحب
