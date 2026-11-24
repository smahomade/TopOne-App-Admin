/** @type {import('tailwindcss').Config} */
// Cream Editorial, the light scheme matching topone.co.uk (the customer app
// uses the same colours): a cream page, white cards, near-black ink for text
// and buttons, warm stone greys.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F4F1EC",   // page background; text on ink buttons
        card: "#FFFFFF",    // cards and sheets
        field: "#EDE8E1",   // inputs, chips and quiet buttons on cards
        line: "#E4DDD3",    // borders and dividers
        ink: {
          DEFAULT: "#1A1817", // text, buttons, links, selected things
          soft: "#3F3A35",
        },
        muted: "#6B635A",   // secondary text
        faint: "#8A8178",   // placeholders, read-only values
        danger: "#B3261E",  // delete and sign-out
        black: {
          DEFAULT: "#000",
        },
      },
      fontFamily: {
        // The class names kept their old "p" (Poppins) prefix; they are DM Sans now.
        pregular: ["DMSans-Regular", "sans-serif"],
        pmedium: ["DMSans-Medium", "sans-serif"],
        psemibold: ["DMSans-SemiBold", "sans-serif"],
        pbold: ["DMSans-Bold", "sans-serif"],
        // Headings, like the website's Playfair Display titles
        display: ["PlayfairDisplay-SemiBold", "serif"],
        "display-medium": ["PlayfairDisplay-Medium", "serif"],
      },
    },
  },
  plugins: [],
};
