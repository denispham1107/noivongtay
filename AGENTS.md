# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# MOBILE WEB INPUT INVARIANT

Every input rendered on mobile web must keep a computed font size of at least 16px.
Do not remove the global iOS/iPadOS WebKit focus-zoom guard in `src/global.css`,
and preserve it whenever adding or restyling TextInput, input, textarea, select,
or contenteditable controls.

# MOBILE WEB REFLOW INVARIANT

Mobile web and every admin screen must remain usable when iOS/Android display
zoom narrows the effective CSS viewport. Do not add rigid minimum widths or
fixed text heights that can clip content. Horizontal rows containing text must
allow their children to shrink or wrap, and text containers inside flex rows
must keep `minWidth: 0`.
