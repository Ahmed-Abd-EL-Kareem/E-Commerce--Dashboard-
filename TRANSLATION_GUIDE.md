# Translation Guide

This guide explains how to use the internationalization (i18n) system in your React project with Arabic and English support.

## Setup Complete ✅

The following has been set up for you:

1. **i18n Configuration** (`src/i18n/index.js`)
2. **Translation Files**:
   - English: `src/i18n/locales/en.json`
   - Arabic: `src/i18n/locales/ar.json`
3. **Language Switcher Component** (`src/components/LanguageSwitcher.jsx`)
4. **Custom Hook** (`src/hooks/useTranslation.js`)
5. **RTL Support** in CSS
6. **Integration** in main App component

## How to Use Translations

### 1. Import the Hook

```jsx
import { useTranslation } from '../hooks/useTranslation';
```

### 2. Use in Component

```jsx
const MyComponent = () => {
  const { t, isRTL, currentLanguage } = useTranslation();

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### 3. Available Translation Keys

#### Common
- `t('common.loading')` - Loading...
- `t('common.save')` - Save
- `t('common.cancel')` - Cancel
- `t('common.delete')` - Delete
- `t('common.edit')` - Edit
- `t('common.add')` - Add
- `t('common.search')` - Search

#### Navigation
- `t('navigation.home')` - Home
- `t('navigation.categories')` - Categories
- `t('navigation.products')` - Products
- `t('navigation.dashboard')` - Dashboard
- `t('navigation.login')` - Login
- `t('navigation.logout')` - Logout

#### Forms
- `t('forms.name')` - Name
- `t('forms.email')` - Email
- `t('forms.password')` - Password
- `t('forms.description')` - Description
- `t('forms.category')` - Category
- `t('forms.price')` - Price

#### Messages
- `t('messages.saveSuccess')` - Saved successfully
- `t('messages.deleteSuccess')` - Deleted successfully
- `t('messages.networkError')` - Network error occurred

#### Auth
- `t('auth.signIn')` - Sign In
- `t('auth.signUp')` - Sign Up
- `t('auth.forgotPassword')` - Forgot Password?

## RTL Support

The system automatically handles RTL (Right-to-Left) for Arabic:

```jsx
const { isRTL } = useTranslation();

// Use in className
<div className={`${isRTL ? 'text-right' : 'text-left'}`}>

// Use for conditional logic
{isRTL ? 'Arabic layout' : 'English layout'}
```

## Adding New Translations

### 1. Add to English file (`src/i18n/locales/en.json`):

```json
{
  "mySection": {
    "newKey": "New English Text"
  }
}
```

### 2. Add to Arabic file (`src/i18n/locales/ar.json`):

```json
{
  "mySection": {
    "newKey": "النص العربي الجديد"
  }
}
```

### 3. Use in component:

```jsx
{t('mySection.newKey')}
```

## Example Integration in Existing Components

### For your CategoriesPage.jsx:

```jsx
import { useTranslation } from '../../hooks/useTranslation';

const CategoriesPage = () => {
  const { t, isRTL } = useTranslation();

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      <h1>{t('navigation.categories')}</h1>
      
      <button className="btn">
        <FiPlus />
        {t('common.add')} {t('navigation.categories')}
      </button>
      
      <input 
        placeholder={t('common.search')}
        className={`input ${isRTL ? 'text-right' : 'text-left'}`}
      />
    </div>
  );
};
```

## Language Switching

The language switcher is automatically available in the top-right corner of your app. Users can click to switch between English and Arabic.

## Best Practices

1. **Always use translation keys** instead of hardcoded text
2. **Use RTL-aware styling** with the `isRTL` flag
3. **Group related translations** in logical sections
4. **Keep translation keys descriptive** and hierarchical
5. **Test both languages** to ensure proper layout

## Current Features

✅ English and Arabic support  
✅ RTL layout for Arabic  
✅ Language persistence in localStorage  
✅ Automatic direction switching  
✅ Language switcher component  
✅ Custom translation hook  
✅ RTL-aware CSS styles  

Your project is now fully internationalized! 🌍 