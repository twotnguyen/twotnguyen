const fs = require("fs");
const https = require("https");

// Curated programming quotes (used 50% of the time for variety, or as fallback)
const programmingQuotes = [
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
  { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
  { text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", author: "Edsger Dijkstra" },
  { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
  { text: "One of my most productive days was throwing away 1,000 lines of code.", author: "Ken Thompson" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
  { text: "Good code is its own best documentation.", author: "Steve McConnell" },
  { text: "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it.", author: "Patrick McKenzie" }
];

// Fetch quote from ZenQuotes API
const fetchZenQuote = () => {
  return new Promise((resolve) => {
    https.get("https://zenquotes.io/api/random", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json[0] && json[0].q && json[0].a) {
            resolve({ text: json[0].q, author: json[0].a });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
};

// Get random programming quote
const getRandomProgrammingQuote = () => {
  return programmingQuotes[Math.floor(Math.random() * programmingQuotes.length)];
};

// Helper function to split text into lines of a maximum length
const wrapText = (text, maxLength) => {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + " " + word).trim().length <= maxLength) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Function to generate the Tokyo Night themed SVG image
const generateSVG = (quoteText, authorName) => {
  const maxLength = 60; // Max characters per line for 600px width
  const lines = wrapText(`"${quoteText}"`, maxLength);
  const lineGap = 24;
  const startY = 48;
  const authorY = startY + lines.length * lineGap + 12;
  const svgHeight = authorY + 36;

  let textElements = "";
  lines.forEach((line, index) => {
    // Escape XML entities
    const escapedLine = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    textElements += `  <text x="40" y="${startY + index * lineGap}" class="quote-text">${escapedLine}</text>\n`;
  });

  const escapedAuthor = authorName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}">
  <style>
    .background {
      fill: #1a1b26;
      stroke: #24283b;
      stroke-width: 1.5;
      rx: 8px;
    }
    .quote-text {
      fill: #73daca;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-style: italic;
    }
    .author-text {
      fill: #7aa2f7;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: bold;
    }
    .quote-mark {
      fill: #3d59a1;
      font-family: Georgia, serif;
      font-size: 80px;
      opacity: 0.25;
    }
  </style>
  <rect width="600" height="${svgHeight}" class="background"/>
  <text x="20" y="70" class="quote-mark">“</text>
  <g>
  ${textElements}  </g>
  <text x="560" y="${authorY}" text-anchor="end" class="author-text">- ${escapedAuthor}</text>
</svg>`;

  return svg;
};

// Main execution
const main = async () => {
  let quote;
  const useProgrammingQuote = Math.random() < 0.5; // 50% chance for each type

  if (useProgrammingQuote) {
    console.log("🔄 Selecting programming quote...");
    quote = getRandomProgrammingQuote();
  } else {
    console.log("🔄 Fetching inspirational quote from ZenQuotes API...");
    quote = await fetchZenQuote();
    if (!quote) {
      console.log("⚠️ API failed or returned invalid data, using programming quote fallback");
      quote = getRandomProgrammingQuote();
    }
  }

  // 1. Generate the SVG content and write to quote.svg
  console.log("🎨 Generating SVG card for the quote...");
  const svgContent = generateSVG(quote.text, quote.author);
  fs.writeFileSync("quote.svg", svgContent);
  console.log("✅ quote.svg generated successfully");

  // 2. Generate the markdown tag for README.md
  const quoteAlt = `Quote of the Day: "${quote.text}" - ${quote.author}`;
  const escapedQuoteAlt = quoteAlt.replace(/\]/g, "\\]"); // Escape markdown brackets
  const quoteMarkdown = `![${escapedQuoteAlt}](quote.svg)`;

  // 3. Read template and write to README.md
  let template = fs.readFileSync("template.md").toString();
  template = template.replace("{QUOTE_HERE}", quoteMarkdown);
  fs.writeFileSync("README.md", template);

  console.log("✅ README.md updated successfully!");
  console.log(`📝 Selected Quote: "${quote.text}" — ${quote.author}`);
};

main();
