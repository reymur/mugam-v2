# Muğam Club — Контекст проекта

## Стек
- Expo SDK 54, React Native, Firebase 10.14.1, Zustand, TypeScript
- Папка: ~/Downloads/mugam-v2
- GitHub: https://github.com/reymur/mugam-v2

## Правила
- Firebase не обновлять
- unstable_enablePackageExports = false в metro.config.js
- Emoji в отдельном Text без стилей
- Zustand — только string[], не Set

## Структура компонентов
src/components/common/
  - EventCard.tsx — единая карточка событий
  - EventModal.tsx — единый Modal (mode: full | time-only)
  - WheelTimePicker.tsx — нативный DateTimePicker height:102
  - LocationPicker.tsx — город/район/ресторан через Google Places API
  - MusicianPicker.tsx — выбор музыкантов как отдельный Modal
  - BottomSheet.tsx — общий overlay
  - CloseButton.tsx — общая кнопка закрытия
  - PersonalEventDetail — детальный экран

src/data/
  - locations.ts — города и районы Азербайджана
  - seedLocations.js — скрипт загрузки в Firestore

## Firebase
- Проект: mugam-club
- Google Places API ключ: AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk
- Firestore: personalEvents (flat, ownerUid + musicians[])

## Последние коммиты
- WheelTimePicker — native picker centered, date aligned
- LocationPicker — city/district/place selector with Google Places
- MusicianPicker — separate modal overlay like LocationPicker
- BottomSheet — shared overlay component
- EventCard — unified design, single border style
- EventModal — replaced Modal with EventModal component

## Pending
- Протестировать LocationPicker и MusicianPicker
- Убрать старый MusicianPicker из Agreements/index.tsx
- DirectChat — старый CustomDatePicker ещё в файле
