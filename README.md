# 📦 Note Card Box

A modern Zettelkasten note-taking system with local-first architecture and visual knowledge graph.

## ✨ Features

- 📝 **Rich Text Editor** - Powered by Tiptap with Markdown support
- 🏷️ **Smart Tagging** - Organize notes with hashtags and auto-suggestions
- 📊 **Knowledge Graph** - Visualize connections between notes with interactive graph
- 🗂️ **Card Types** - Permanent, Innovation, Literature, and Project cards
- 💾 **Local-First** - All data stored in IndexedDB for offline access
- 🔄 **Optional Sync** - Cloud sync with NextAuth.js authentication
- 🔗 **Easy Sharing** - Share individual cards via public links
- 🌓 **Dark Mode** - Beautiful UI with light/dark theme support
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Editor**: [Tiptap](https://tiptap.dev/) (Rich text editor)
- **Graph**: [ReactFlow](https://reactflow.dev/) (Knowledge graph visualization)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via [idb](https://github.com/jakearchibald/idb))
- **Auth**: [NextAuth.js](https://next-auth.js.org/) (Optional)
- **State Management**: React Context API
- **Validation**: [Zod](https://zod.dev/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/KW-Yeh/note-card-box.git
cd note-card-box
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Optional: Set up Authentication

Create a `.env.local` file for cloud sync features:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 📖 Usage

### Creating Cards

1. Click "New Card" to create a note
2. Choose card type (Permanent, Innovation, Literature, or Project)
3. Write content using the rich text editor
4. Add hashtags for organization
5. Save and your card is stored locally

### Organizing with Tags

- Use `#hashtag` in your content to create tags
- View all tags in the Tags page
- Filter cards by clicking on tags

### Knowledge Graph

- Navigate to the Graph view
- See visual connections between your cards
- Click nodes to navigate to specific cards

### Sharing Cards

- Toggle "Public" on any card
- Copy the share link
- Anyone with the link can view (no login required)

## 🏗️ Project Structure

```plaintext
note-card-box/
├── app/                    # Next.js app router pages
│   ├── (dashboard)/       # Dashboard layout group
│   ├── cards/             # Card CRUD pages
│   └── api/               # API routes
├── components/            # React components
│   ├── cards/            # Card-related components
│   ├── editor/           # Tiptap editor components
│   ├── graph/            # Knowledge graph components
│   └── ui/               # shadcn/ui components
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── types/                # TypeScript type definitions
```

## 📝 Card Types

- **Permanent Notes** 📚 - Main knowledge base with permanent insights
- **Innovation Notes** 💡 - Fleeting ideas and quick thoughts
- **Literature Notes** 📖 - Notes from books, articles, papers
- **Project Notes** 🎯 - Project-specific notes and tasks

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by the [Zettelkasten method](https://zettelkasten.de/)
- Built with amazing open-source tools and libraries
