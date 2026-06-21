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

## Последние изменения
- EventModal.tsx — единый Modal для календаря и чата договора
- WheelTimePicker.tsx — нативный DateTimePicker с height:102
- LocationPicker.tsx — выбор города/района/ресторана через Google Places API
- MusicianPicker.tsx — выбор музыкантов как отдельный Modal
- BottomSheet.tsx — общий overlay компонент
- CloseButton.tsx — общая кнопка закрытия
- EventCard.tsx — единая карточка для всех событий
- PersonalEventDetail — детальный экран личного мероприятия
- Firestore: personalEvents (flat структура с ownerUid)
- Google Places API ключ: AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk

## Pending задачи
- Тестировать LocationPicker и MusicianPicker в приложении
- DirectChat — старый MusicianPicker Modal ещё не удалён
