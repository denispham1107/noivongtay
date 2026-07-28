# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# MOBILE WEB INPUT INVARIANT

Every input rendered on mobile web must keep a computed font size of at least 16px.
Do not remove the global iOS/iPadOS WebKit focus-zoom guard in `src/global.css`,
and preserve it whenever adding or restyling TextInput, input, textarea, select,
or contenteditable controls.
