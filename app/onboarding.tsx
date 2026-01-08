import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const slides = [
    {
        title: 'Witaj w WorkTimeMoney',
        description: 'Twoje proste narzędzie do liczenia i śledzenia zarobków.',
        buttonText: 'Zaczynajmy!',
        color: '#4F46E5', // Indigo
    },
    {
        title: 'Licz swoje zarobki',
        description: 'Podaj przepracowane godziny oraz stawkę na rękę. My policzymy resztę i zapiszemy w bezpiecznej bazie.',
        buttonText: 'Dalej',
        color: '#7C3AED', // Violet
    },
    {
        title: 'Przeglądaj historię',
        description: 'Zawsze masz dostęp do swoich wyników z poprzednich miesięcy. Możesz je edytować w dowolnym momencie.',
        buttonText: 'Gotowe',
        color: '#2563EB', // Blue
    },
];

export default function OnboardingScreen() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();

    const handleNext = async () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
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
