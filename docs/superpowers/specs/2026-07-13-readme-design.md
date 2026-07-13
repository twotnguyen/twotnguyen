# Thiết kế Profile README - twotnguyen

Tài liệu thiết kế chi tiết cho cấu trúc và cách thức hoạt động của kho lưu trữ Profile README cá nhân của Nguyễn Thành (`twotnguyen`).

---

## 1. Mục tiêu & Phạm vi dự án
* **Mục tiêu:** Tạo một trang cá nhân GitHub (Profile README) chuyên nghiệp, thẩm mỹ và sống động, phản ánh đầy đủ năng lực kỹ thuật (Full-stack, Mobile, Desktop, Tooling) của Nguyễn Thành.
* **Cơ chế tự động hóa:**
  1. Tự động cập nhật câu châm ngôn ("Quote of the Day") hàng ngày bằng Node.js script.
  2. Tự động vẽ rắn ăn đóng góp ("Contribution Snake") dựa trên lịch sử đóng góp đóng góp.

---

## 2. Kiến trúc & Cấu trúc thư mục

Dự án được xây dựng dưới dạng một kho lưu trữ độc lập tại `/Users/twot/Documents/CODE/README/twotnguyen`:

```text
twotnguyen/
├── .github/
│   └── workflows/
│       ├── commit.yml          # Workflow chạy Node.js script cập nhật Quote hàng ngày
│       └── snake.yml           # Workflow tạo contribution snake và đẩy lên nhánh output
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-07-13-readme-design.md  # [Tài liệu này]
├── index.js                    # Script Node.js lấy quote từ API và ghi đè README.md
├── template.md                 # Template README chứa các biến tĩnh và động {QUOTE_HERE}
├── package.json                # Định nghĩa project và script chạy local
├── .gitignore                  # Bỏ qua node_modules và các file tạm
└── README.md                   # File kết quả được sinh ra tự động (không sửa tay trực tiếp)
```

---

## 3. Thiết kế chi tiết các thành phần động

### 3.1. Cập nhật Quote of the Day (`index.js` & `commit.yml`)
* **Hành vi Script (`index.js`):**
  * Gửi yêu cầu HTTP GET đến `https://zenquotes.io/api/random` để lấy câu châm ngôn ngẫu nhiên.
  * Nếu API thành công, lưu lại quote dưới dạng markdown format:
    ```markdown
    > "Quote text"
    >
    > — *Author*
    ```
  * Nếu API thất bại (hoặc timeout), chọn ngẫu nhiên từ danh sách câu quote lập trình chọn lọc (Curated Programming Quotes) được nhúng trực tiếp trong file JS làm phương án dự phòng (fallback).
  * Đọc tệp `template.md`, thay thế `{QUOTE_HERE}` bằng đoạn markdown trên và ghi đè vào `README.md`.
* **Hành vi Workflow (`.github/workflows/commit.yml`):**
  * Sử dụng hệ điều hành `ubuntu-latest`.
  * Chạy định kỳ vào lúc **00:00 UTC** hàng ngày (`cron: "0 0 * * *"`).
  * Chạy script cập nhật, sau đó commit file `README.md` mới nhất với message `Update Daily Quote` và tự động push lên nhánh `main`.

### 3.2. Generate Contribution Snake SVG (`snake.yml`)
* **Hành vi Workflow (`.github/workflows/snake.yml`):**
  * Sử dụng action `Platane/snk@v3` với đầu vào `github_user_name: twotnguyen`.
  * Xuất ra hai định dạng:
    * `dist/github-contribution-grid-snake-dark.svg?palette=github-dark` (cho dark theme)
    * `dist/github-contribution-grid-snake.svg` (cho light theme)
  * Sử dụng action `crazy-max/ghaction-github-pages@v4` để đẩy toàn bộ thư mục `dist` chứa các file SVG lên nhánh `output` của repository.
  * Trong `template.md`, liên kết trực tiếp tới file SVG trên nhánh `output` qua URL thô: `https://raw.githubusercontent.com/twotnguyen/twotnguyen/output/github-contribution-grid-snake-dark.svg`.

---

## 4. Thiết kế Giao diện & Bố cục (`template.md`)

File template được thiết kế bằng ngôn ngữ tiếng Anh nhằm tối ưu hóa sự chuyên nghiệp quốc tế.

### 4.1. Header
* Chứa tiêu đề căn giữa: `# Hi there, I'm Nguyen Thanh 👋`.
* Tích hợp **Typing SVG** chuyển động:
  * URL: `https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=70A5FD&center=true&vCenter=true&width=600&lines=Software+Engineer;Full-Stack+Developer;Cross-Platform+Mobile+Creator;Desktop+%26+Tooling+Builder`
* Badges chỉ số:
  * Followers: `https://img.shields.io/github/followers/twotnguyen?logo=github&style=for-the-badge&color=0891b2&labelColor=1c1917`
  * Stars: `https://img.shields.io/github/stars/twotnguyen?style=for-the-badge&logo=github&color=0891b2&labelColor=1c1917`
  * Views: `https://komarev.com/ghpvc/?username=twotnguyen&style=for-the-badge&color=blueviolet`

### 4.2. Khối JSON Về Tôi (About Me)
Mô tả trực quan dưới dạng khối mã TypeScript / JSON:
```json
{
  "name": "Nguyen Thanh",
  "role": "Software Engineer",
  "based_in": "Ho Chi Minh City, Vietnam",
  "core_stack": ["TypeScript", "React", "NestJS", "PostgreSQL"],
  "other_stacks": ["Flutter / Dart", "C# / .NET 9", "Tauri / Rust", "Python"],
  "side_quest": "Designing custom VS Code extensions & AI agent workflows",
  "motto": "Build robust, modular, and developer-friendly systems."
}
```

### 4.3. Tiêu điểm hiện tại (Current Focus)
Sử dụng bảng monospace thô:
```text
🔭 Side project  Antigravity Cockpit (VS Code Extension) & Cockpit Tools (Tauri v2 + Rust)
💬 Ask me about  React, NestJS, Flutter, Tauri, VS Code Extension API
⚡ Fun fact      I design custom AI agent rules & workflows to automate development
```

### 4.4. Tech Stack Badges
Hiển thị các badge được phân nhóm rõ ràng (sử dụng shields.io màu sắc phù hợp):
* **Languages:** TypeScript, JavaScript, Dart, C#, Rust, Python, C++, SQL.
* **Web & Backend:** Node.js, NestJS, ASP.NET Core, Express, Socket.IO, SignalR, BullMQ.
* **Frontend & Mobile:** React, Vite, Zustand, React Query, Flutter, Riverpod, CSS3/Tailwind.
* **Databases & DevOps:** PostgreSQL, Supabase, Redis, SQL Server, SQLite, Docker, GitHub Actions, Playwright.

### 4.5. Các dự án nổi bật (Featured Projects)
* **🚀 Antigravity Cockpit (v3.0 alpha)** - *VS Code Extension productivity tooling:* Cấu trúc MVC TypeScript, Webview floating HUD, `sql.js` WebAssembly SQLite database analyzer, hỗ trợ đa ngôn ngữ (15+).
* **🌍 TravelConnectVN** - *Full-stack Travel Booking & Social Platform:* React 19, NestJS, PostgreSQL, Redis cache, BullMQ async queues, Socket.IO gateway, Supabase RLS, Gemini AI itinerary integration, Playwright E2E.
* **📦 Cockpit Tools** - *AI Developer Quota Desktop Client:* Rust backend, Tauri v2, React 19, Tailwind/DaisyUI, `tokio` async workers, `sysinfo` process analysis.
* **💻 PowerTech** - *Enterprise Computer Hardware E-Commerce:* C#/.NET 9, ASP.NET Core MVC, Razor, SQL Server, EF Core, SignalR realtime support ticketing, 6 custom Areas (Storefront, Customer, Sales, Warehouse, Support, Shipper).

### 4.6. Đồ thị & Hiệu ứng Rắn
* Biểu đồ hoạt động: `github-readme-activity-graph` với theme `tokyo-night`.
* Rắn ăn đóng góp liên kết đến branch `output` của user `twotnguyen`.

### 4.7. Chân trang
* Placeholder `{QUOTE_HERE}` để tự động thay thế quote.
* Wave Banner từ capsule-render (`type=waving`) màu sắc hài hòa.
* Châm ngôn: *"One must imagine a system happy."*

---

## 5. Kế hoạch kiểm thử & Xác minh (Verification Plan)

### 5.1. Chạy thử nghiệm Local (Node.js)
* Chạy `node index.js` ở máy local để kiểm tra xem script có hoạt động ổn định không, có gọi được API ZenQuotes hay không, có đọc `template.md` và ghi đè thành công `README.md` với định dạng quote chuẩn hay không.

### 5.2. Chạy thử nghiệm GitHub Actions
* Đẩy mã nguồn lên GitHub.
* Chạy thủ công hai workflows (`commit.yml` và `snake.yml`) bằng nút `Run workflow` trong giao diện GitHub Actions để xác nhận:
  * Node script chạy thành công trên máy ảo Linux.
  * Git commit & push được thực hiện thành công.
  * Rắn đóng góp được sinh ra và đẩy lên nhánh `output` chuẩn xác.
