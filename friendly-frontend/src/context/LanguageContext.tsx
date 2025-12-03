import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'ko' | 'zh' | 'mn' | 'vi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@app_language';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Profile
    'profile.title': 'Profile',
    'profile.edit': 'Edit Profile',
    'profile.memberSince': 'MEMBER SINCE',
    'profile.schoolEmail': 'SCHOOL EMAIL',
    'profile.studentNumber': 'STUDENT NUMBER',
    'profile.major': 'MAJOR',
    'profile.language': 'LANGUAGE',
    'profile.addMajor': 'Add Major',
    'profile.signOut': 'Sign Out',
    'profile.fullName': 'Full Name',
    'profile.nickname': 'Nickname',
    'profile.university': 'University',
    'profile.majorLabel': 'Major',
    'profile.languageLabel': 'Language',
    'profile.cancel': 'Cancel',
    'profile.save': 'Save',
    'profile.chooseLanguage': 'Choose Language',
    'language.english': 'English',
    'language.korean': 'Korean',
    'language.chinese': 'Chinese',
    'language.mongolian': 'Mongolian',
    'language.vietnamese': 'Vietnamese',
  },
  ko: {
    // Profile
    'profile.title': '프로필',
    'profile.edit': '프로필 편집',
    'profile.memberSince': '가입일',
    'profile.schoolEmail': '학교 이메일',
    'profile.studentNumber': '학번',
    'profile.major': '전공',
    'profile.language': '언어',
    'profile.addMajor': '전공 추가',
    'profile.signOut': '로그아웃',
    'profile.fullName': '이름',
    'profile.nickname': '닉네임',
    'profile.university': '대학교',
    'profile.majorLabel': '전공',
    'profile.languageLabel': '언어',
    'profile.cancel': '취소',
    'profile.save': '저장',
    'profile.chooseLanguage': '언어 선택',
    'language.english': '영어',
    'language.korean': '한국어',
    'language.chinese': '중국어',
    'language.mongolian': '몽골어',
    'language.vietnamese': '베트남어',
  },
  zh: {
    // Profile
    'profile.title': '个人资料',
    'profile.edit': '编辑个人资料',
    'profile.memberSince': '注册日期',
    'profile.schoolEmail': '学校邮箱',
    'profile.studentNumber': '学号',
    'profile.major': '专业',
    'profile.language': '语言',
    'profile.addMajor': '添加专业',
    'profile.signOut': '登出',
    'profile.fullName': '全名',
    'profile.nickname': '昵称',
    'profile.university': '大学',
    'profile.majorLabel': '专业',
    'profile.languageLabel': '语言',
    'profile.cancel': '取消',
    'profile.save': '保存',
    'profile.chooseLanguage': '选择语言',
    'language.english': '英语',
    'language.korean': '韩语',
    'language.chinese': '中文',
    'language.mongolian': '蒙古语',
    'language.vietnamese': '越南语',
  },
  mn: {
    // Profile
    'profile.title': 'Профайл',
    'profile.edit': 'Профайл засах',
    'profile.memberSince': 'ГИШҮҮДСЭН ОГНОО',
    'profile.schoolEmail': 'СУРГУУЛИЙН ИМАЙЛ',
    'profile.studentNumber': 'ОЮУТНЫ ДУГААР',
    'profile.major': 'МЭРГЭЖИЛ',
    'profile.language': 'ХЭЛ',
    'profile.addMajor': 'Мэргэжил нэмэх',
    'profile.signOut': 'Гарах',
    'profile.fullName': 'Бүтэн нэр',
    'profile.nickname': 'Хоч нэр',
    'profile.university': 'Их сургууль',
    'profile.majorLabel': 'Мэргэжил',
    'profile.languageLabel': 'Хэл',
    'profile.cancel': 'Цуцлах',
    'profile.save': 'Хадгалах',
    'profile.chooseLanguage': 'Хэл сонгох',
    'language.english': 'Англи',
    'language.korean': 'Солонгос',
    'language.chinese': 'Хятад',
    'language.mongolian': 'Монгол',
    'language.vietnamese': 'Вьетнам',
  },
  vi: {
    // Profile
    'profile.title': 'Hồ sơ',
    'profile.edit': 'Chỉnh sửa hồ sơ',
    'profile.memberSince': 'THÀNH VIÊN TỪ',
    'profile.schoolEmail': 'EMAIL TRƯỜNG HỌC',
    'profile.studentNumber': 'MÃ SỐ SINH VIÊN',
    'profile.major': 'CHUYÊN NGÀNH',
    'profile.language': 'NGÔN NGỮ',
    'profile.addMajor': 'Thêm chuyên ngành',
    'profile.signOut': 'Đăng xuất',
    'profile.fullName': 'Họ và tên',
    'profile.nickname': 'Biệt danh',
    'profile.university': 'Trường đại học',
    'profile.majorLabel': 'Chuyên ngành',
    'profile.languageLabel': 'Ngôn ngữ',
    'profile.cancel': 'Hủy',
    'profile.save': 'Lưu',
    'profile.chooseLanguage': 'Chọn ngôn ngữ',
    'language.english': 'Tiếng Anh',
    'language.korean': 'Tiếng Hàn',
    'language.chinese': 'Tiếng Trung',
    'language.mongolian': 'Tiếng Mông Cổ',
    'language.vietnamese': 'Tiếng Việt',
  },
};

const languageNames: Record<Language, string> = {
  en: 'English',
  ko: 'Korean',
  zh: 'Chinese',
  mn: 'Mongolian',
  vi: 'Vietnamese',
};

export const getLanguageName = (lang: Language): string => {
  return languageNames[lang];
};

export const getAllLanguages = (): Array<{ code: Language; name: string }> => {
  return Object.entries(languageNames).map(([code, name]) => ({
    code: code as Language,
    name,
  }));
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && ['en', 'ko', 'zh', 'mn', 'vi'].includes(savedLanguage)) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

