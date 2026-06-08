import React, { useEffect, useState, useRef } from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { translateText } from '../config/translationService';
import { useLanguage } from '../context/LanguageContext';
import { IconSymbol } from './ui/icon-symbol';

// Simple in-memory cache to avoid repeated API calls for the same text + lang
const translationCache = new Map<string, string>();

interface TranslatedTextProps {
  text: string;
  targetLang: 'pl' | 'en';
  isDark: boolean;
}

export function TranslatedText({ text, targetLang, isDark }: TranslatedTextProps) {
  const { t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true); // Default to original
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRequested, setIsRequested] = useState(false); // Wait for click
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isRequested || !text || text.trim() === '') {
      return;
    }

    const cacheKey = `${text}__${targetLang}`;

    // Check cache first
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      setShowOriginal(false); // Automatically show translation once loaded from cache
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    translateText(text, targetLang).then((result) => {
      if (cancelled || !isMounted.current) return;

      // Store in cache
      translationCache.set(cacheKey, result);
      setTranslatedText(result);
      setIsTranslating(false);
      setShowOriginal(false); // Show translated text initially
    }).catch(() => {
      if (!cancelled && isMounted.current) {
        setTranslatedText(null);
        setIsTranslating(false);
      }
    });

    return () => { cancelled = true; };
  }, [text, targetLang, isRequested]);

  // Determine if translation actually changed the text
  const hasTranslation = translatedText !== null
    && translatedText.trim().toLowerCase() !== text.trim().toLowerCase();

  // Decide what text to display
  const displayText = hasTranslation && !showOriginal ? translatedText : text;

  // Dynamic button label
  const getButtonText = () => {
    if (!isRequested) {
      return targetLang === 'en' ? 'Tłumacz na angielski' : 'Translate to Polish';
    }
    return showOriginal ? t('showTranslated') : t('showOriginal');
  };

  const handlePress = () => {
    if (!isRequested) {
      setIsRequested(true);
    } else {
      setShowOriginal(!showOriginal);
    }
  };

  return (
    <View>
      <Text className={`text-md leading-5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {displayText}
      </Text>

      {isTranslating && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <ActivityIndicator size="small" color={isDark ? '#818CF8' : '#6366F1'} />
        </View>
      )}

      {/* Render toggle button: either to start translating or to toggle between original & translation */}
      {(!isRequested || (hasTranslation && !isTranslating)) && (
        <TouchableOpacity
          onPress={handlePress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            paddingVertical: 2,
            gap: 4,
          }}
          activeOpacity={0.6}
        >
          <IconSymbol
            name="globe"
            size={13}
            color={isDark ? '#818CF8' : '#6366F1'}
          />
          <Text
            style={{
              fontSize: 11,
              color: isDark ? '#818CF8' : '#6366F1',
              fontWeight: '600',
            }}
          >
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
