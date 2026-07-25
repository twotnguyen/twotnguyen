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

const TOKEN = process.env.GITHUB_TOKEN || '';

const graphql = (query, variables = {}, token = TOKEN) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request(
      'https://api.github.com/graphql',
      {
        method: 'POST',
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Node.js',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.errors) {
              reject(new Error(JSON.stringify(json.errors)));
            } else {
              resolve(json.data);
            }
          } catch (e) {
            reject(new Error('JSON Parse error: ' + data));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

const LOC_QUERY = `
query($owner: String!, $name: String!, $id: ID!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 100, author: {id: $id}, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { additions deletions }
          }
        }
      }
    }
  }
}
`;

const loadCache = () => {
  try {
    if (fs.existsSync('cache.json')) {
      return JSON.parse(fs.readFileSync('cache.json', 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Error loading cache:', e.message);
  }
  return { repos: {} };
};

const saveCache = (cache) => {
  try {
    fs.writeFileSync('cache.json', JSON.stringify(cache, null, 2), 'utf8');
    console.log('✅ cache.json updated successfully');
  } catch (e) {
    console.error('⚠️ Error saving cache:', e.message);
  }
};

const loadArchive = () => {
  try {
    if (fs.existsSync('archive.json')) {
      return JSON.parse(fs.readFileSync('archive.json', 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Error loading archive:', e.message);
  }
  return { repos: [] };
};

const IGNORED_REPOS = [
  "PharmaAssist",
  "GALAXY_FIGHTER",
  "TravelConnectVN",
  "TH_LT_Web",
  "pharmaassist-data-collector"
];

const getLoc = async (reposList, userId, cache) => {
  let add = 0;
  let rem = 0;
  for (const repo of reposList) {
    const name = repo.name;

    if (IGNORED_REPOS.includes(name)) {
      console.log(`[SKIP] Ignoring LOC for ${name} to prevent stats inflation`);
      continue;
    }

    const ref = repo.defaultBranchRef;
    const currentOid = ref ? ref.target.oid : null;
    
    // Check cache
    if (currentOid && cache.repos[name] && cache.repos[name].headCommit === currentOid) {
      const cached = cache.repos[name];
      add += cached.loc_add;
      rem += cached.loc_del;
      console.log(`⚡ Using cached LOC for ${name}: +${cached.loc_add} -${cached.loc_del}`);
      continue;
    }

    if (!ref) {
      cache.repos[name] = { headCommit: null, loc_add: 0, loc_del: 0, loc: 0 };
      continue;
    }

    let repoAdd = 0;
    let repoRem = 0;
    let cursor = null;
    let pages = 0;
    console.log(`[START] Calculating LOC for repo: ${name}`);
    try {
      while (true) {
        pages++;
        const res = await graphql(LOC_QUERY, { owner: 'twotnguyen', name, id: userId, cursor });
        const historyRef = res.repository ? res.repository.defaultBranchRef : null;
        if (!historyRef) break;
        const h = historyRef.target.history;
        for (const n of h.nodes) {
          repoAdd += n.additions;
          repoRem += n.deletions;
        }
        if (!h.pageInfo.hasNextPage) break;
        cursor = h.pageInfo.endCursor;
      }
      console.log(`[DONE] ${name}: +${repoAdd} -${repoRem} (${repoAdd - repoRem} LOC, ${pages} pages)`);
      cache.repos[name] = { headCommit: currentOid, loc_add: repoAdd, loc_del: repoRem, loc: repoAdd - repoRem };
      add += repoAdd;
      rem += repoRem;
    } catch (e) {
      console.error(`⚠️ Error calculating LOC for repo ${name}:`, e.message);
      // Fallback: if cached data exists, use it so we don't drop to 0 on network error
      if (cache.repos[name]) {
        const cached = cache.repos[name];
        add += cached.loc_add;
        rem += cached.loc_del;
        console.log(`⚠️ Failed to fetch, using cached fallback LOC for ${name}: +${cached.loc_add} -${cached.loc_del}`);
      }
    }
  }
  return { loc_add: add, loc_del: rem, loc: add - rem };
};

const getMockupStats = () => {
  return {
    followers: 5,
    repos: 20,
    contributed: 3,
    stars: 5,
    commits: 3581,
    loc_add: 10299760,
    loc_del: 3298245,
    loc: 7001515
  };
};

const fetchGitHubStats = async () => {
  if (!TOKEN) {
    console.log("⚠️ No GITHUB_TOKEN environment variable found. SVG cards will use mockup stats.");
    return getMockupStats();
  }

  const JOINED_YEAR = 2025;
  const currentYear = new Date().getUTCFullYear();
  let yr_aliases = '';
  for (let y = JOINED_YEAR; y <= currentYear; y++) {
    yr_aliases += `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y + 1}-01-01T00:00:00Z") { totalCommitContributions restrictedContributionsCount }\n`;
  }

  const query = `
  query {
    user(login: "twotnguyen") {
      ${yr_aliases}
      id
      followers { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER) {
        totalCount
        nodes {
          name
          stargazerCount
          isFork
          defaultBranchRef {
            target {
              oid
            }
          }
        }
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
    }
  }
  `;

  try {
    const data = await graphql(query);
    const user = data.user;

    let commits = 0;
    for (let y = JOINED_YEAR; y <= currentYear; y++) {
      const col = user[`y${y}`];
      if (col) {
        commits += col.totalCommitContributions + col.restrictedContributionsCount;
      }
    }

    const reposList = user.repositories.nodes;
    const nonForkReposList = reposList.filter(r => !r.isFork);
    const stars = reposList.reduce((acc, r) => acc + r.stargazerCount, 0);

    // Sum archive stats
    const archive = loadArchive();
    let archivedRepos = 0;
    let archivedStars = 0;
    let archivedCommits = 0;
    let archivedLocAdd = 0;
    let archivedLocDel = 0;

    if (archive.repos && archive.repos.length > 0) {
      console.log(`📦 Loading stats for ${archive.repos.length} archived/deleted repositories...`);
      for (const r of archive.repos) {
        archivedRepos++;
        archivedStars += r.stars || 0;
        archivedCommits += r.commits || 0;
        archivedLocAdd += r.loc_add || 0;
        archivedLocDel += r.loc_del || 0;
      }
    }

    const stats = {
      followers: user.followers.totalCount,
      repos: user.repositories.totalCount + archivedRepos,
      contributed: user.repositoriesContributedTo.totalCount,
      stars: stars + archivedStars,
      commits: commits + archivedCommits
    };

    console.log('Calculating Lines of Code (LOC) for own repositories...');
    const cache = loadCache();
    if (!cache.repos) cache.repos = {};
    const locStats = await getLoc(nonForkReposList, user.id, cache);
    saveCache(cache);

    return {
      ...stats,
      loc_add: locStats.loc_add + archivedLocAdd,
      loc_del: locStats.loc_del + archivedLocDel,
      loc: locStats.loc + (archivedLocAdd - archivedLocDel)
    };
  } catch (err) {
    console.error('⚠️ Failed to fetch GitHub stats from API:', err.message);
    console.log('Falling back to mockup stats.');
    return getMockupStats();
  }
};

const ART = [
  "                     =**##**                         ",
  "                  ++==*##*==+=+++****                ",
  "                 +==**#*+=-----=++++*###             ",
  "                 ==++**##=--=-:-====#**+=-           ",
  "                :-=*++==::-++-=++**+==----           ",
  "                :-=---:-=*%#*+==++=-------           ",
  "                ---:-:-+#%%%%#+----:::::---          ",
  "                ::::::=#%%%%%#*=--::::::::-          ",
  "               :-::::-#%%%%%%##+--:::::::-           ",
  "                -::::-=-=+*##**+=-::::::::           ",
  "               *+=--+====-:=-::------:::::           ",
  "              *+*+*+++====:=----:---:--:-            ",
  "              **+**+****+=#@+=++++==++=+*#           ",
  "              #*****#*++#%%%%+=---=+++=++            ",
  "               #******#*+=+=-=****++*++#@            ",
  "                 #********++++***+++**##             ",
  "                 ******=======+++++**                ",
  "                  ******++++=++++++*                 ",
  "                  ********++++++++*                  ",
  "                  **+++****+++++++*                  ",
  "                  *++++++++++==++*#@@                ",
  "                *#*+++++++++++=++*#@@#               ",
  "                *#*==++++++++=+*##@@@*++             ",
  "              -:*##*===++++++*###%@@%=++++           ",
  "           ::::-##+-=++==+*+=*##%@@%+=+++++=         ",
  "        :::::::*#+:::=*+==+-::=%@@*====+++-=+**      ",
  "    ++=::::::::++++=-:::::::-=+*#*#========:-++++*   ",
  " ++++=::::::::::*+*+*=:::::+****##+=========:-+++++**",
  "++++=:::::::::::*****+:::-***###%*=====--::==:====+++"
].join("\n");

const PALETTES = {
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    art: "#8b949e",
    h: "#58a6ff",
    k: "#ffa657",
    v: "#c9d1d9",
    d: "#484f58",
    g: "#3fb950",
    r: "#f85149"
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    art: "#57606a",
    h: "#0969da",
    k: "#953800",
    v: "#24292f",
    d: "#afb8c1",
    g: "#1a7f37",
    r: "#cf222e"
  }
};

const W = 56;

const calculateUptime = () => {
  const BIRTHDAY = new Date(2005, 10, 8); // Nov 8, 2005 (Month is 0-indexed)
  const startDate = BIRTHDAY || new Date(2025, 0, 21); // Jan 21, 2025 (Joined Date)
  const now = new Date();

  let years = now.getUTCFullYear() - startDate.getUTCFullYear();
  let months = now.getUTCMonth() - startDate.getUTCMonth();
  let days = now.getUTCDate() - startDate.getUTCDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const suffix = BIRTHDAY ? "" : " on GitHub";
  let parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

  if (parts.length === 0) return "0 days" + suffix;
  return parts.join(', ') + suffix;
};

const kv = (key, val, width = W) => {
  const keyStr = `${key}: `;
  const valStr = String(val);
  const dotsLen = Math.max(width - keyStr.length - valStr.length - 1, 1);
  const dots = ".".repeat(dotsLen);
  return [
    { text: keyStr, color: "k" },
    { text: dots + " ", color: "d" },
    { text: valStr, color: "v" }
  ];
};

const kv2 = (k1, v1, k2, v2) => {
  const left = kv(k1, v1, 30);
  const right = kv(k2, v2, 23);
  return [
    ...left,
    { text: " | ", color: "d" },
    ...right
  ];
};

const rule = (title = "") => {
  const label = title ? `─ ${title} ` : "";
  const bar = "─".repeat(Math.max(W - label.length, 0));
  return [
    { text: label, color: "h" },
    { text: bar, color: "d" }
  ];
};

const formatNumber = (num) => {
  return Number(num).toLocaleString('en-US');
};

const getInfoLines = (stats) => {
  const uptimeStr = calculateUptime();
  return [
    [
      { text: "twotnguyen@github ", color: "h" },
      { text: "─".repeat(W - "twotnguyen@github ".length), color: "d" }
    ],
    [],
    kv("OS", "macOS, Windows"),
    kv("Uptime", uptimeStr),
    kv("Host", "Ho Chi Minh City, Vietnam"),
    kv("Kernel", "Full-Stack Developer"),
    kv("IDE", "VS Code, Claude Code, Antigravity, Codex"),
    [],
    kv("Languages.Programming", "Type, JavaScript, C#, HTML, CSS, .."),
    kv("Languages.Real", "Vietnamese (Native), English"),
    kv("Hobbies", "Coding, Music, Economics, AI Agent Workflows"),
    [],
    rule("Contact"),
    kv("Email", "nguyenngoctinh011258@gmail.com"),
    kv("GitHub", "github.com/twotnguyen"),
    [],
    rule("GitHub Stats"),
    kv2("Repos", `${stats.repos} {Contributed: ${stats.contributed}}`, "Stars", formatNumber(stats.stars)),
    kv2("Commits", formatNumber(stats.commits), "Followers", formatNumber(stats.followers)),
    [
      { text: "Lines of Code: ", color: "k" },
      { text: formatNumber(stats.loc), color: "v" },
      { text: " ( ", color: "d" },
      { text: `${formatNumber(stats.loc_add)}++`, color: "g" },
      { text: ", ", color: "d" },
      { text: `${formatNumber(stats.loc_del)}--`, color: "r" },
      { text: " )", color: "d" }
    ]
  ];
};

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const renderProfileSVG = (mode, stats) => {
  const p = PALETTES[mode];
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="930" height="500" viewBox="0 0 930 500" font-family="Consolas, Menlo, monospace" font-size="13px">`,
    `  <rect x="0.5" y="0.5" width="929" height="499" rx="10" fill="${p.bg}" stroke="${p.border}"/>`
  ];

  const artLines = ART.split("\n");
  artLines.forEach((line, i) => {
    out.push(`  <text x="25" y="${40 + i * 15}" fill="${p.art}" xml:space="preserve">${escapeHtml(line)}</text>`);
  });

  const infoLines = getInfoLines(stats);
  infoLines.forEach((segs, i) => {
    if (segs.length === 0) return;
    const spans = segs.map(seg => `<tspan fill="${p[seg.color]}">${escapeHtml(seg.text)}</tspan>`).join('');
    out.push(`  <text x="470" y="${45 + i * 21}" xml:space="preserve">${spans}</text>`);
  });

  out.push(`</svg>`);
  return out.join("\n");
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
  const maxLength = 62; // Max characters per line for 600px width with 45px padding
  const lines = wrapText(quoteText, maxLength); // Wrap raw quoteText without quotes
  const lineGap = 24;
  const startY = 48;
  const authorY = startY + lines.length * lineGap + 12;
  const svgHeight = authorY + 36;

  let textElements = "";
  lines.forEach((line, index) => {
    // Escape XML entities
    let escapedLine = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    if (index === 0) {
      // First line gets the opening quote mark
      const openingQuote = `<tspan fill="#cba6f7" font-family="Georgia, serif" font-size="20px" font-weight="bold">“</tspan>`;
      if (lines.length === 1) {
        // Only one line, get both opening and closing marks
        const closingQuote = `<tspan fill="#cba6f7" font-family="Georgia, serif" font-size="20px" font-weight="bold">”</tspan>`;
        textElements += `  <text x="45" y="${startY}" class="quote-text">${openingQuote}${escapedLine}${closingQuote}</text>\n`;
      } else {
        textElements += `  <text x="45" y="${startY}" class="quote-text">${openingQuote}${escapedLine}</text>\n`;
      }
    } else if (index === lines.length - 1) {
      // Last line gets the closing quote mark
      const closingQuote = `<tspan fill="#cba6f7" font-family="Georgia, serif" font-size="20px" font-weight="bold">”</tspan>`;
      textElements += `  <text x="45" y="${startY + index * lineGap}" class="quote-text">${escapedLine}${closingQuote}</text>\n`;
    } else {
      // Middle lines
      textElements += `  <text x="45" y="${startY + index * lineGap}" class="quote-text">${escapedLine}</text>\n`;
    }
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
      fill: #1e1e2e;
      stroke: #313244;
      stroke-width: 1;
      rx: 8px;
    }
    .accent-bar {
      fill: #cba6f7;
      rx: 2px;
    }
    .quote-text {
      fill: #86e2d5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-style: italic;
    }
    .author-text {
      fill: #89b4fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: bold;
    }
  </style>
  <rect width="600" height="${svgHeight}" class="background"/>
  <rect x="12" y="16" width="4" height="${svgHeight - 32}" class="accent-bar"/>
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

  // 2. Fetch GitHub stats and generate profile card SVGs
  console.log("🔄 Fetching GitHub stats...");
  const stats = await fetchGitHubStats();
  console.log("🎨 Generating SVG profile cards...");
  fs.writeFileSync("profile_dark.svg", renderProfileSVG("dark", stats));
  fs.writeFileSync("profile_light.svg", renderProfileSVG("light", stats));
  console.log("✅ profile_dark.svg and profile_light.svg generated successfully");

  // 3. Generate the markdown tag for README.md with cache-busting timestamp query parameter
  const timestamp = new Date().getTime();
  const quoteAlt = `Quote of the Day: "${quote.text}" - ${quote.author}`;
  const escapedQuoteAlt = quoteAlt.replace(/\]/g, "\\]"); // Escape markdown brackets
  const quoteMarkdown = `![${escapedQuoteAlt}](quote.svg?v=${timestamp})`;

  // 4. Read template and write to README.md
  let template = fs.readFileSync("template.md").toString();
  template = template.replace("{QUOTE_HERE}", quoteMarkdown);
  fs.writeFileSync("README.md", template);

  console.log("✅ README.md updated successfully!");
  console.log(`📝 Selected Quote: "${quote.text}" — ${quote.author}`);
};

main();
