import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export default function Menu({ isOpen, onClose, onNavigate }: MenuProps) {
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleNavigation = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: typeof window === 'undefined',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: typeof window === 'undefined',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 300,
          useNativeDriver: typeof window === 'undefined',
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: typeof window === 'undefined',
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, opacityAnim]);

  if (!isOpen) return null;

  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return (
      <div className="absolute inset-0 z-40">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          style={{
            opacity: 1,
            transition: 'opacity 0.3s ease',
          }}
        />
        
        {/* Menu */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#426b1f] z-50 overflow-hidden"
          style={{
            transform: `translateX(0px)`,
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Background Illustration */}
          <MaskGroup />
          
          {/* Menu Items */}
          <MenuItems onNavigate={handleNavigation} />
          
          {/* Close Button */}
          <CloseButton onClick={onClose} />
        </div>
      </div>
    );
  }

  // React Native version
  const { View, TouchableWithoutFeedback } = require('react-native');
  
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: opacityAnim,
          }}
        />
      </TouchableWithoutFeedback>
      
      {/* Menu */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          backgroundColor: '#426b1f',
          zIndex: 50,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* Menu Items */}
        <MenuItems onNavigate={handleNavigation} />
        
        {/* Close Button */}
        <CloseButton onClick={onClose} />
      </Animated.View>
    </View>
  );
}

function MaskGroup() {
  return null;
}

interface MenuItemsProps {
  onNavigate: (screen: string) => void;
}

function MenuItems({ onNavigate }: MenuItemsProps) {
  const menuItems = [
    { label: "Shop", screen: "list" },
    { label: "Newsstand", screen: "newsstand" },
    { label: "My Profile", screen: "profile" },
    { label: "Basket", screen: "basket" },
  ];

  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return (
      <div className="absolute left-4 top-[95px]">
        <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start p-0 relative">
          {menuItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-[#ffffff] text-[26px] text-left text-nowrap tracking-[-0.52px] hover:opacity-80 transition-opacity"
            >
              <p className="block leading-[30px] whitespace-pre text-[36px]">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // React Native version
  const { View, TouchableOpacity, Text } = require('react-native');
  
  return (
    <View style={{ position: 'absolute', left: 16, top: 95 }}>
      <View style={{ flexDirection: 'column', gap: 32 }}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => onNavigate(item.screen)}
            style={{ opacity: 1 }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: 36,
                fontWeight: 'normal',
                lineHeight: 30,
                letterSpacing: -0.52,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface CloseButtonProps {
  onClick: () => void;
}

function CloseButton({ onClick }: CloseButtonProps) {
  // Check if we're in a web environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return (
      <button
        onClick={onClick}
        className="absolute block cursor-pointer left-[14px] overflow-visible rounded-2xl size-6 top-[35px] hover:opacity-80 transition-opacity"
      >
        <div className="absolute h-[9.5px] left-[5px] top-[5px] w-[9.6px]">
          <div className="absolute bottom-[-4.167%] left-[-4.123%] right-[-4.123%] top-[-4.167%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
              <g>
                <path
                  d="M1 1.00003L13.7279 13.7279"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M1.13605 13.7279L13.864 1"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            </svg>
          </div>
        </div>
      </button>
    );
  }

  // React Native version
  const { TouchableOpacity } = require('react-native');
  const { X } = require('lucide-react-native');
  
  return (
    <TouchableOpacity
      onPress={onClick}
      style={{
        position: 'absolute',
        left: 14,
        top: 35,
        width: 24,
        height: 24,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      activeOpacity={0.8}
    >
      <X size={20} color="white" />
    </TouchableOpacity>
  );
}