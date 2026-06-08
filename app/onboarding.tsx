import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

export default function OnboardingScreen() {
    const { t } = useLanguage();
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();

    const slides = [
        {
            title: t('onboardingSlide1Title'),
            description: t('onboardingSlide1Desc'),
            buttonText: t('onboardingSlide1Btn'),
            color: '#4F46E5', // Indigo
        },
        {
            title: t('onboardingSlide2Title'),
            description: t('onboardingSlide2Desc'),
            buttonText: t('onboardingSlide2Btn'),
            color: '#7C3AED', // Violet
        },
        {
            title: t('onboardingSlide3Title'),
            description: t('onboardingSlide3Desc'),
            buttonText: t('onboardingSlide3Btn'),
            color: '#2563EB', // Blue
        },
    ];

    const handleNext = async () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            try {
                await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            } catch (err) {
                console.error('[Onboarding] handleNext - Error saving onboarding flag:', err);
            }
            router.replace('/login');
        }
    };

    const slide = slides[currentSlide];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: slide.color }}>
            <StatusBar style="light" />
            <View className="flex-1 p-6 justify-between">
                <View className="mt-24">
                    <Text className="text-4xl font-extrabold text-white mb-4 text-center">
                        {slide.title}
                    </Text>
                    <Text className="text-lg text-white/80 text-center leading-7">
                        {slide.description}
                    </Text>
                </View>

                <View className="mb-10 items-center">
                    <View className="flex-row mb-8">
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                className={`h-2 rounded-full mx-1 ${index === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/30'}`}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        className="bg-white py-4 px-8 rounded-2xl w-full items-center shadow-lg"
                        onPress={handleNext}
                    >
                        <Text className="text-lg font-bold" style={{ color: slide.color }}>
                            {slide.buttonText}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}